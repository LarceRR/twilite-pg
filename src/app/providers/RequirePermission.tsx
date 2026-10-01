import type { ReactNode } from "react";
import { Link } from "react-router";

import { usePermissions } from "@/shared/lib/rbac";
import { AppRoutes } from "@/shared/const/routes";

import "./ForbiddenPage.scss";

type RequirePermissionProps = {
  /** Single required permission. */
  permission?: string;
  /** At least one of these permissions. */
  anyOf?: readonly string[];
  /** All of these permissions. */
  allOf?: readonly string[];
  children: ReactNode;
};

/**
 * Route gate: renders a Russian 403 page when the session lacks required permissions.
 */
export function RequirePermission({
  permission,
  anyOf,
  allOf,
  children,
}: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  const allowed =
    (permission === undefined || hasPermission(permission)) &&
    (anyOf === undefined || hasAnyPermission(anyOf)) &&
    (allOf === undefined || hasAllPermissions(allOf));

  if (!allowed) {
    return <ForbiddenPage />;
  }

  return children;
}

function ForbiddenPage() {
  return (
    <section className="forbidden-page" role="alert">
      <p className="forbidden-page__code">403</p>
      <h1 className="forbidden-page__title">Доступ запрещён</h1>
      <p className="forbidden-page__text">
        У вас недостаточно прав для просмотра этой страницы.
      </p>
      <Link className="forbidden-page__link" to={AppRoutes[0].routes.HOME.path}>
        На главную
      </Link>
    </section>
  );
}
