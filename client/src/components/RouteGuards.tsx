import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../useAuth";

export function RequireAuth() {
  const { token, user } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { user } = useAuth();
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/overview" replace />;
}

export function AuthOnly({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  return token && user ? <Navigate to="/overview" replace /> : children;
}
