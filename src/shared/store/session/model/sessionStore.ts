import { create } from "zustand";

import { getMe, refreshSession, signOutRequest } from "@/shared/api/auth";
import { ApiError, registerSessionRefresh } from "@/shared/api/http";

import type { SessionState } from "./types";

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clear: () => set({ user: null }),
}));

let refreshInFlight: Promise<boolean> | null = null;
let bootstrapInFlight: Promise<void> | null = null;

async function runRefresh(): Promise<boolean> {
  try {
    await refreshSession();
    return true;
  } catch {
    useSessionStore.getState().clear();
    return false;
  }
}

registerSessionRefresh(() => {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = runRefresh().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
});

/**
 * Reconcile the client user with the server. Cookies hold the durable session
 * (httpOnly); Zustand only mirrors the public profile for the UI.
 *
 * A 401 after refresh failure clears the store; RequireAuth then sends the user
 * to login — callers must not navigate themselves.
 *
 * Single-flight: React Strict Mode and overlapping focus probes share one probe.
 */
export async function bootstrapSession(): Promise<void> {
  if (bootstrapInFlight) {
    return bootstrapInFlight;
  }

  bootstrapInFlight = (async () => {
    try {
      useSessionStore.getState().setUser(await getMe());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        useSessionStore.getState().clear();
        return;
      }

      // Keep the existing user on transient failures; probe again on focus.
    }
  })().finally(() => {
    bootstrapInFlight = null;
  });

  return bootstrapInFlight;
}

export async function completeLogin(): Promise<void> {
  const user = await getMe();
  useSessionStore.getState().setUser(user);
}

export async function signOut(): Promise<void> {
  try {
    await signOutRequest();
  } catch {
    // Local sign-out must still succeed if the server is unreachable.
  } finally {
    useSessionStore.getState().clear();
  }
}
