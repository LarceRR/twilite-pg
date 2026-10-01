import { useSessionStore } from "@/shared/store/session/model/sessionStore";

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "./permissionMatcher";

/**
 * Permission helpers bound to the current session user's effective permissions.
 */
export function usePermissions() {
  const permissions = useSessionStore((state) => state.user?.permissions ?? []);

  return {
    permissions,
    hasPermission: (required: string) => hasPermission(permissions, required),
    hasAnyPermission: (required: readonly string[]) => hasAnyPermission(permissions, required),
    hasAllPermissions: (required: readonly string[]) => hasAllPermissions(permissions, required),
  };
}
