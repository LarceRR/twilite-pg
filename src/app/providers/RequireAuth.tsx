import type { ReactNode } from "react";
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router";

import { AppRoutes } from "@/shared/const/routes";
import { bootstrapSession, useSessionStore } from "@/shared/store/session";

type RequireAuthProps = {
  children: ReactNode;
};

/**
 * Gate: no user in the store → login. Session loss (sign-out, failed refresh,
 * remote revoke discovered by a probe) clears the store; this component alone
 * decides where to send the browser.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const user = useSessionStore((state) => state.user);
  const location = useLocation();

  useEffect(() => {
    if (user === null) {
      return;
    }

    const revalidate = (): void => {
      if (document.visibilityState === "visible") {
        void bootstrapSession();
      }
    };

    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener("focus", revalidate);
    return () => {
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener("focus", revalidate);
    };
  }, [user]);

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    const login = AppRoutes[3].routes.LOGIN.path;
    return <Navigate to={`${login}?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}
