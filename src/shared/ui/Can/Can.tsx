import type { ReactNode } from "react";

import { usePermissions } from "@/shared/lib/rbac";

type CanProps = {
  /** Single required permission. */
  permission?: string;
  /** At least one of these permissions. */
  anyOf?: readonly string[];
  /** All of these permissions. */
  allOf?: readonly string[];
  children: ReactNode;
  /** Rendered when the check fails (default: nothing). */
  fallback?: ReactNode;
};

/**
 * Conditionally render children based on session permissions.
 * Prefer one of `permission` | `anyOf` | `allOf`; if several are set, all must pass.
 */
export function Can({ permission, anyOf, allOf, children, fallback = null }: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  const allowed =
    (permission === undefined || hasPermission(permission)) &&
    (anyOf === undefined || hasAnyPermission(anyOf)) &&
    (allOf === undefined || hasAllPermissions(allOf));

  return allowed ? children : fallback;
}
