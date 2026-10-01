import type { SessionUser } from "@/shared/api/auth";

export type SessionState = {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  clear: () => void;
};
