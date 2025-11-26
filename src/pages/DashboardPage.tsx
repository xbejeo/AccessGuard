import React, { useState, useEffect } from "react";
import { MainLayout } from "../layouts/MainLayout";
import { Card } from "../components/Card";
import { SectionTitle } from "../components/SectionTitle";
import { Button } from "../components/Button";
import { SubscriptionCard } from "../components/SubscriptionCard";
import { HistoryItem } from "../components/HistoryItem";
import { EditableField } from "../components/EditableField";
import {
  UserIcon,
  PhoneIcon,
  MailIcon,
  LogOutIcon,
} from "lucide-react";
import QRCode from "react-qr-code";

import { useAuth } from "../context/AuthContext";
import { db, auth } from "../firebase";

import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  getDocs,
  addDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

// =========================
// QR-анимация
// =========================
const QRCard: React.FC<{ uid: string }> = ({ uid }) => {
  return (
    <div
      className="mt-6 flex justify-center animate-fade-slide"
      style={{ animation: "fadeSlide 0.35s ease-out" }}
    >
      <div className="border border-gray-300 rounded-xl p-5 bg-white shadow-md">
        <QRCode value={`accessguard://user/${uid}`} size={180} />
        <p className="text-center mt-2 text-sm text-gray-600">
          Покажите этот QR-код при входе
        </p>
      </div>
    </div>
  );
};

const fadeSlideCSS = `
@keyframes fadeSlide {
  0% { opacity: 0; transform: translateY(-8px); }
  100% { opacity: 1; transform: translateY(0); }
}
`;
document.head.insertAdjacentHTML("beforeend", `<style>${fadeSlideCSS}</style>`);

// ===================================================
// ОСНОВНОЙ Dashboard с покупкой абонемента
// ===================================================
export const DashboardPage: React.FC = () => {
  const { user, userData } = useAuth();

  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const [showQRCode, setShowQRCode] = useState(false);
  const [renderQR, setRenderQR] = useState(false);

  // FIRESTORE ДАННЫЕ
  const [plans, setPlans] = useState<any[]>([]);
  const [membership, setMembership] = useState<any | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // -------------------------------
  // Анимация QR
  // -------------------------------
  useEffect(() => {
    if (showQRCode) setRenderQR(true);
    else setTimeout(() => setRenderQR(false), 250);
  }, [showQRCode]);

  // -------------------------------
  // Загрузка истории посещений
  // -------------------------------
  useEffect(() => {
    if (!user) return;

    const ref = collection(db, "visits");
    const q = query(
      ref,
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    return onSnapshot(q, (snap) => {
      setVisitHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  // -------------------------------
  // Загрузка тарифов
  // -------------------------------
  useEffect(() => {
    const loadPlans = async () => {
      const snap = await getDocs(collection(db, "plans"));
      const arr: any[] = [];
      snap.forEach((p) => arr.push({ id: p.id, ...p.data() }));
      setPlans(arr);
    };

    loadPlans();
  }, []);

  // -------------------------------
  // Загрузка активного membership
  // -------------------------------
  useEffect(() => {
    const loadMembership = async () => {
      if (!userData?.activeMembershipId) {
        setMembership(null);
        return;
      }

      const ref = doc(db, "memberships", userData.activeMembershipId);
      const snap = await getDoc(ref);

      if (snap.exists()) setMembership({ id: snap.id, ...snap.data() });
      else setMembership(null);
    };

    loadMembership();
  }, [userData]);

  // -------------------------------
  // Покупка абонемента
  // -------------------------------
  const purchasePlan = async (planId: string) => {
  if (!user) return;

  setBuyingId(planId);

  try {
    // 1. Загружаем тариф
    const planRef = doc(db, "plans", planId);
    const planSnap = await getDoc(planRef);
    if (!planSnap.exists()) return;

    const p = planSnap.data();

    // 2. Вычисляем дату окончания
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + (p.durationDays || 30));

    // 3. Создаем membership с null-датами
    const membershipRef = await addDoc(collection(db, "memberships"), {
      userId: user.uid,
      planId,
      planName: p.name,
      price: p.price,
      startedAt: null,          // 🔥 вместо timestamp → null
      expiresAt: null,          // 🔥 вместо timestamp → null
      remainingVisits:
        p.maxVisits && p.maxVisits !== 9999 ? p.maxVisits : null,
      status: "active",
    });

    // 4. Обновляем документ реальными датами
    await updateDoc(membershipRef, {
      startedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expires),
    });

    // 5. Записываем в профиль пользователя
    await updateDoc(doc(db, "users", user.uid), {
      activeMembershipId: membershipRef.id,
    });

    // 6. Загружаем обратно новый membership в UI
    const msnap = await getDoc(membershipRef);
    setMembership({ id: membershipRef.id, ...msnap.data() });
  } catch (error) {
    console.error("Ошибка покупки абонемента:", error);
  } finally {
    setBuyingId(null);
  }
};


  // -------------------------------
  // Сохранение профиля
  // -------------------------------
  const handleSave = async (field: string, value: string) => {
    await updateDoc(doc(db, "users", user.uid), { [field]: value });
    setIsEditing(false);
  };

  // -------------------------------
  // Выход
  // -------------------------------
  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!user) return <div className="p-10 text-center">Загрузка...</div>;

  const hasActiveSub = !!membership;

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Личный кабинет</h1>
        <p className="text-gray-600">Добро пожаловать, {user.fullName}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — основной блок */}
        <div className="lg:col-span-2 space-y-6">

          {/* СТАТУС АБОНЕМЕНТА */}
          <div>
            <SectionTitle>Статус абонемента</SectionTitle>

            {hasActiveSub ? (
              <Card className="border-l-4 border-green-500">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-700 mb-2">
                      Абонемент активен
                    </h3>

                    <div className="space-y-1 mb-4 md:mb-0">
                      {membership.remainingVisits != null && (
                        <p className="text-gray-700">
                          <span className="font-medium">
                            Осталось посещений:
                          </span>{" "}
                          {membership.remainingVisits}
                        </p>
                      )}
                      <p className="text-gray-700">
                        <span className="font-medium">Дата окончания:</span>{" "}
                        {membership.expiresAt
                          ?.toDate()
                          ?.toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => setShowQRCode(!showQRCode)}
                  >
                    {showQRCode ? "Скрыть QR-код" : "Показать QR-код"}
                  </Button>
                </div>

                {renderQR && <QRCard uid={user.uid} />}
              </Card>
            ) : (
              <>
                <Card className="border-l-4 border-yellow-500 mb-6">
                  <h3 className="text-lg font-semibold text-yellow-700 mb-2">
                    У вас нет активного абонемента
                  </h3>
                  <p className="text-gray-600">
                    Приобретите абонемент, чтобы посещать занятия
                  </p>
                </Card>

                {/* ДОСТУПНЫЕ АБОНЕМЕНТЫ */}
                <SectionTitle>Доступные абонементы</SectionTitle>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((p) => (
                    <SubscriptionCard
                      key={p.id}
                      title={p.name}
                      description={p.description}
                      price={`${p.price}₸`}
                      benefits={[
                        `${p.durationDays} дней`,
                        p.maxVisits !== 9999
                          ? `${p.maxVisits} посещений`
                          : "Неограниченно",
                      ]}
                      borderColor="border-blue-500"
                      onClick={() => purchasePlan(p.id)}
                      disabled={buyingId === p.id}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ИСТОРИЯ */}
          <div>
            <SectionTitle>История посещений</SectionTitle>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {visitHistory.length > 0 ? (
                visitHistory.map((item) => (
                  <HistoryItem
                    key={item.id}
                    date={item.timestamp.toDate().toLocaleDateString("ru-RU")}
                    time={item.timestamp.toDate().toLocaleTimeString("ru-RU")}
                    status={item.status}
                  />
                ))
              ) : (
                <p className="text-gray-500">Посещений пока нет.</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — профиль */}
        <div className="space-y-6">
          <div>
            <SectionTitle>Персональные данные</SectionTitle>
            <Card>
              <div className="space-y-4">
                <EditableField
                  label="ФИО"
                  value={user.fullName}
                  icon={<UserIcon className="w-5 h-5 text-gray-500" />}
                  isEditing={isEditing}
                  onSave={(v) => handleSave("fullName", v)}
                  onCancel={() => setIsEditing(false)}
                />

                <EditableField
                  label="Телефон"
                  value={user.phone || ""}
                  type="tel"
                  icon={<PhoneIcon className="w-5 h-5 text-gray-500" />}
                  isEditing={isEditing}
                  onSave={(v) => handleSave("phone", v)}
                  onCancel={() => setIsEditing(false)}
                />

                <EditableField
                  label="Email"
                  value={user.email}
                  type="email"
                  icon={<MailIcon className="w-5 h-5 text-gray-500" />}
                  isEditing={isEditing}
                  onSave={(v) => handleSave("email", v)}
                  onCancel={() => setIsEditing(false)}
                />
              </div>

              {!isEditing && (
                <div className="mt-6">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setIsEditing(true)}
                  >
                    Редактировать
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <div>
            <SectionTitle>Навигация</SectionTitle>
            <Card>
              <button
                onClick={handleLogout}
                className="flex items-center p-2 hover:bg-gray-50 rounded-lg transition text-red-600 w-full"
              >
                <LogOutIcon className="w-5 h-5 mr-3" />
                Выйти из аккаунта
              </button>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
