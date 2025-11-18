// src/router/AppRouter.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import RegistrationPage from "../pages/RegistrationPage";
import { DashboardPage } from "../pages/DashboardPage";

import { useAuth } from "../context/AuthContext";

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Загрузка...</div>;
  if (!user) return <Navigate to="/" replace />;

  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RegistrationPage />} />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
