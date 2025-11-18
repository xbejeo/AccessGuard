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
} from "firebase/firestore";
import { signOut } from "firebase/auth";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // local state
  const [isEditing, setIsEditing] = useState(false);
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [showQRCode, setShowQRCode] = useState(false);

  // load visit history
  useEffect(() => {
    if (!user) return;

    const ref = collection(db, "visits");
    const q = query(
      ref,
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setVisitHistory(items);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user)
    return <div className="p-10 text-center">Загрузка данных...</div>;

  const handleSave = async (field: string, value: string) => {
    const ref = doc(db, "users", user.uid);

    await updateDoc(ref, {
      [field]: value,
    });

    setIsEditing(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const hasActiveSub =
    user.visitsLeft > 0 &&
    user.subscriptionEnd &&
    new Date(user.subscriptionEnd.toDate()) > new Date();

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Личный кабинет</h1>
        <p className="text-gray-600">
          Добро пожаловать, {user.fullName}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Subscription Block */}
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
                      <p className="text-gray-700">
                        <span className="font-medium">
                          Осталось посещений:
                        </span>{" "}
                        {user.visitsLeft}
                      </p>

                      <p className="text-gray-700">
                        <span className="font-medium">
                          Дата окончания:
                        </span>{" "}
                        {user.subscriptionEnd
                          ? user.subscriptionEnd
                              .toDate()
                              .toLocaleDateString("ru-RU")
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0">
                    <Button
                      variant="primary"
                      onClick={() => setShowQRCode(!showQRCode)}
                    >
                      {showQRCode ? "Скрыть QR" : "Показать QR"}
                    </Button>
                  </div>
                </div>

                {showQRCode && (
                  <div className="mt-6 flex justify-center">
                    <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
                      <QRCode value={user.uid} size={180} />
                      <p className="text-center mt-2 text-sm text-gray-600">
                        Покажите этот QR-код при входе
                      </p>
                    </div>
                  </div>
                )}
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
                  <SubscriptionCard
                    title="4 посещения"
                    description="Базовый"
                    price="2000₸"
                    benefits={[
                      "30 дней",
                      "Тренажёры",
                      "Групповые занятия",
                    ]}
                    borderColor="border-blue-500"
                  />

                  <SubscriptionCard
                    title="8 посещений"
                    description="Стандарт"
                    price="3600₸"
                    benefits={[
                      "45 дней",
                      "Тренажёры",
                      "Групповые занятия",
                      "Сауна",
                    ]}
                    borderColor="border-purple-500"
                  />

                  <SubscriptionCard
                    title="Безлимит"
                    description="Премиум"
                    price="5900₸"
                    benefits={[
                      "30 дней",
                      "Неограниченно",
                      "Все услуги",
                      "Личный шкафчик",
                    ]}
                    borderColor="border-indigo-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Visit History */}
          <div>
            <SectionTitle>История посещений</SectionTitle>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {visitHistory.length > 0 ? (
                visitHistory.map((item) => (
                  <HistoryItem
                    key={item.id}
                    date={item.timestamp
                      .toDate()
                      .toLocaleDateString("ru-RU")}
                    time={item.timestamp
                      .toDate()
                      .toLocaleTimeString("ru-RU")}
                    status={item.status}
                  />
                ))
              ) : (
                <p className="text-gray-500">
                  Посещений пока нет.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
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
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={handleLogout}
                    className="flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors text-red-600 w-full"
                  >
                    <LogOutIcon className="w-5 h-5 mr-3" />
                    <span>Выйти из аккаунта</span>
                  </button>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
