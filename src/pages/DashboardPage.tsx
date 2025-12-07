import React, { useEffect, useState } from "react";
import { MainLayout } from "../layouts/MainLayout";
import { Card } from "../components/Card";
import { SectionTitle } from "../components/SectionTitle";
import { Button } from "../components/Button";
import { SubscriptionCard } from "../components/SubscriptionCard";
import { HistoryItem } from "../components/HistoryItem";
import { UserIcon, PhoneIcon, MailIcon, LogOutIcon } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { db, auth } from "../firebase";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

/* ========= Типы ========= */

type Plan = {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number | string;
  maxVisits?: number;
};

type Membership = {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  price: number;
  startedAt: any;
  expiresAt: any;
  remainingVisits: number | null;
  status: "active" | "expired";
};

type Visit = {
  id: string;
  userId: string;
  membershipId: string;
  timestamp: any;
  status: string;
};

/* ========= Вспомогательные функции ========= */

const toDateSafe = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v.toDate === "function") {
    try {
      return v.toDate();
    } catch {
      return null;
    }
  }
  if (v instanceof Date) return v;
  return null;
};

const formatDateSafe = (v: any): string => {
  const d = toDateSafe(v);
  return d ? d.toLocaleDateString("ru-RU") : "—";
};

/* ========= Страница ========= */

export const DashboardPage: React.FC = () => {
  const { user, userData } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [visitHistory, setVisitHistory] = useState<Visit[]>([]);

  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [isWritingOff, setIsWritingOff] = useState(false);

  // состояние профиля
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
  });

  /* ============================
     Инициализация формы профиля
     ============================ */
  useEffect(() => {
    if (!user && !userData) return;

    const fullName =
      (userData && (userData as any).fullName) ||
      (userData && (userData as any).displayName) ||
      (user && (user as any).fullName) ||
      user?.displayName ||
      "";

    const phone =
      (userData && (userData as any).phone) ||
      (user && (user as any).phone) ||
      user?.phoneNumber ||
      "";

    setProfileForm({ fullName, phone });
  }, [user, userData]);

  /* ============================
     Загрузка тарифов
     ============================ */
  useEffect(() => {
    const loadPlans = async () => {
      const snap = await getDocs(collection(db, "plans"));
      const list: Plan[] = [];
      snap.forEach((d) =>
        list.push({
          id: d.id,
          ...(d.data() as any),
        })
      );
      setPlans(list);
    };

    loadPlans().catch(console.error);
  }, []);

  /* ============================
     Загрузка активного абонемента
     ============================ */
  useEffect(() => {
    if (!user) return;

    const loadMembership = async () => {
      let loaded: Membership | null = null;

      // 1) по activeMembershipId из документа user
      if (userData?.activeMembershipId) {
        try {
          const ref = doc(db, "memberships", userData.activeMembershipId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data() as any;
            if (data.status === "active") {
              loaded = { id: snap.id, ...data };
            }
          }
        } catch (e) {
          console.error(
            "Ошибка загрузки membership по activeMembershipId:",
            e
          );
        }
      }

      // 2) fallback по userId + status == active (если activeMembershipId пустой или битый)
      if (!loaded) {
        try {
          const ref = collection(db, "memberships");
          const q = query(
            ref,
            where("userId", "==", user.uid),
            where("status", "==", "active")
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const d = snap.docs[0];
            loaded = { id: d.id, ...(d.data() as any) };
          }
        } catch (e) {
          console.error("Ошибка поиска активного membership по userId:", e);
        }
      }

      setMembership(loaded);
    };

    loadMembership().catch(console.error);
  }, [user, userData]);

  /* ============================
     История посещений
     Только визиты текущего абонемента
     ============================ */
  useEffect(() => {
    if (!user || !membership) {
      setVisitHistory([]);
      return;
    }

    const ref = collection(db, "visits");
    const q = query(
      ref,
      where("userId", "==", user.uid),
      where("membershipId", "==", membership.id)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Visit[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));

        // сортируем по дате по убыванию
        list.sort((a, b) => {
          const da = toDateSafe(a.timestamp)?.getTime() ?? 0;
          const db = toDateSafe(b.timestamp)?.getTime() ?? 0;
          return db - da;
        });

        setVisitHistory(list);
      },
      (err) => {
        console.error("Ошибка загрузки истории посещений:", err);
      }
    );

    return unsub;
  }, [user, membership?.id]); // при смене / исчезновении абонемента пересоздаём подписку

  /* ============================
     Покупка абонемента
     ============================ */
  const purchasePlan = async (planId: string) => {
    if (!user) return;

    setBuyingId(planId);
    try {
      const planRef = doc(db, "plans", planId);
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) {
        console.error("Тариф не найден");
        return;
      }

      const p = planSnap.data() as any;

      const durationDaysRaw = p.durationDays ?? 30;
      const durationDays =
        typeof durationDaysRaw === "number"
          ? durationDaysRaw
          : parseInt(String(durationDaysRaw), 10) || 30;

      const now = new Date();
      const expires = new Date(
        now.getTime() + durationDays * 24 * 60 * 60 * 1000
      );

      const membershipRef = await addDoc(collection(db, "memberships"), {
        userId: user.uid,
        planId,
        planName: p.name,
        price: p.price,
        startedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expires),
        remainingVisits:
          p.maxVisits && p.maxVisits !== 9999 ? p.maxVisits : null,
        status: "active",
      });

      await updateDoc(doc(db, "users", user.uid), {
        activeMembershipId: membershipRef.id,
      });

      const msnap = await getDoc(membershipRef);
      setMembership({ id: membershipRef.id, ...(msnap.data() as any) });
    } catch (e) {
      console.error("Ошибка покупки абонемента:", e);
    } finally {
      setBuyingId(null);
    }
  };

  /* ============================
     Списание посещения
     При достижении 0 — делаем статус expired
     и убираем activeMembershipId у пользователя
     ============================ */
  const handleWriteOffVisit = async () => {
    if (!user || !membership) return;

    const current = membership.remainingVisits;

    if (current == null) {
      // Безлимитный тариф — пока ничего не делаем со статусом,
      // просто пишем визит
      try {
        setIsWritingOff(true);
        await addDoc(collection(db, "visits"), {
          userId: user.uid,
          membershipId: membership.id,
          timestamp: serverTimestamp(),
          status: "visited",
        });
      } catch (e) {
        console.error("Ошибка списания (безлимит):", e);
      } finally {
        setIsWritingOff(false);
      }
      return;
    }

    if (current <= 0) {
      return;
    }

    const newRemaining = current - 1;
    const isFinished = newRemaining <= 0;

    try {
      setIsWritingOff(true);

      // пишем визит
      await addDoc(collection(db, "visits"), {
        userId: user.uid,
        membershipId: membership.id,
        timestamp: serverTimestamp(),
        status: "visited",
      });

      // обновляем membership
      const mRef = doc(db, "memberships", membership.id);
      const updates: any = { remainingVisits: newRemaining };
      if (isFinished) {
        updates.status = "expired";
      }
      await updateDoc(mRef, updates);

      if (isFinished) {
        // убираем активный абонемент у пользователя
        await updateDoc(doc(db, "users", user.uid), {
          activeMembershipId: null,
        });
        // в локальном стейте считаем, что абонемента нет
        setMembership(null);
      } else {
        // иначе просто обновляем счётчик в стейте
        setMembership((prev) =>
          prev ? { ...prev, remainingVisits: newRemaining } : prev
        );
      }
    } catch (e) {
      console.error("Ошибка списания посещения:", e);
    } finally {
      setIsWritingOff(false);
    }
  };

  /* ============================
     Сохранение профиля (ФИО, телефон)
     ============================ */
  const saveProfile = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
      });
      setProfileEditing(false);
    } catch (e) {
      console.error("Ошибка обновления профиля:", e);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="p-10 text-center">Загрузка...</div>
      </MainLayout>
    );
  }

  const hasActiveSub = !!membership;
  const greetingName =
    (userData && (userData as any).fullName) ||
    user.displayName ||
    profileForm.fullName ||
    "";

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Личный кабинет</h1>
        <p className="text-gray-600">Добро пожаловать, {greetingName}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: статус + тарифы + история */}
        <div className="lg:col-span-2 space-y-6">
          {/* Статус абонемента */}
          <div>
            <SectionTitle>Статус абонемента</SectionTitle>

            {hasActiveSub ? (
              <Card className="border-l-4 border-green-500">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-green-700 mb-2">
                      Абонемент активен
                    </h3>

                    <div className="space-y-1 mb-2">
                      <p className="text-gray-700">
                        <span className="font-medium">Тариф:</span>{" "}
                        {membership?.planName}
                      </p>

                      {membership?.remainingVisits != null && (
                        <p className="text-gray-700">
                          <span className="font-medium">
                            Осталось посещений:
                          </span>{" "}
                          {membership.remainingVisits}
                        </p>
                      )}

                      <p className="text-gray-700">
                        <span className="font-medium">Дата окончания:</span>{" "}
                        {formatDateSafe(membership?.expiresAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch md:items-end gap-2">
                    <p className="text-sm text-gray-500 max-w-xs text-right">
                      Нажмите кнопку, чтобы списать одно посещение при визите в
                      зал.
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleWriteOffVisit}
                      disabled={
                        isWritingOff ||
                        (membership?.remainingVisits != null &&
                          membership.remainingVisits <= 0)
                      }
                    >
                      {isWritingOff ? "Списываем..." : "Списать посещение"}
                    </Button>
                  </div>
                </div>
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
                        p.maxVisits && p.maxVisits !== 9999
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

          {/* История посещений (только текущий абонемент) */}
          <div>
            <SectionTitle>История посещений</SectionTitle>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {hasActiveSub && visitHistory.length > 0 ? (
                visitHistory.map((item) => {
                  const d = toDateSafe(item.timestamp);
                  return (
                    <HistoryItem
                      key={item.id}
                      date={d ? d.toLocaleDateString("ru-RU") : "—"}
                      time={d ? d.toLocaleTimeString("ru-RU") : ""}
                      status={item.status}
                    />
                  );
                })
              ) : hasActiveSub ? (
                <p className="text-gray-500">Посещений пока нет.</p>
              ) : (
                <p className="text-gray-500">
                  Нет активного абонемента — история не отображается.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: профиль + выход */}
        <div className="space-y-6">
          <div>
            <SectionTitle>Персональные данные</SectionTitle>
            <Card>
              <div className="space-y-4">
                {/* ФИО */}
                <div className="flex items-start gap-3">
                  <UserIcon className="w-5 h-5 text-gray-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">ФИО</p>
                    {profileEditing ? (
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={profileForm.fullName}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            fullName: e.target.value,
                          }))
                        }
                        placeholder="Введите ФИО"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">
                        {profileForm.fullName || "—"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Телефон */}
                <div className="flex items-start gap-3">
                  <PhoneIcon className="w-5 h-5 text-gray-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Телефон</p>
                    {profileEditing ? (
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="+7…"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">
                        {profileForm.phone || "—"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email (read-only) */}
                <div className="flex items-start gap-3">
                  <MailIcon className="w-5 h-5 text-gray-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="font-medium text-gray-900">{user.email}</p>
                  </div>
                </div>
              </div>

              {profileEditing ? (
                <div className="mt-6 flex gap-3">
                  <Button variant="primary" fullWidth onClick={saveProfile}>
                    Сохранить
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setProfileEditing(false);
                      const fullName =
                        (userData && (userData as any).fullName) ||
                        (userData && (userData as any).displayName) ||
                        (user && (user as any).fullName) ||
                        user?.displayName ||
                        "";
                      const phone =
                        (userData && (userData as any).phone) ||
                        (user && (user as any).phone) ||
                        user?.phoneNumber ||
                        "";
                      setProfileForm({ fullName, phone });
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              ) : (
                <div className="mt-6">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setProfileEditing(true)}
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
