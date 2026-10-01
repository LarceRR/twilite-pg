import { apiFetch } from "@/shared/api/http";
import { webDeviceInfo } from "@/shared/lib/auth/deviceInfo";

export type DeviceInfo = {
  platform: "ios" | "android" | "web" | "unknown";
  model?: string | null;
  appVersion?: string | null;
};

export type AuthSession = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt: string;
  userId: string;
};

export type SessionGroup = {
  id: string;
  name: string;
};

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  /** Effective RBAC permissions from `/v1/users/me`. */
  permissions: string[];
  /** Optional group memberships when the API includes them. */
  groups?: SessionGroup[];
};

export type QrLoginStart = {
  challengeId: string;
  qrPayload: string;
  pollToken: string;
  expiresAt: string;
  expiresInSeconds: number;
};

export type QrLoginStatus =
  | { status: "pending" }
  | { status: "scanned" }
  | { status: "denied" }
  | { status: "expired" }
  | { status: "approved"; session?: AuthSession };

export async function startQrLogin(device: DeviceInfo = webDeviceInfo()): Promise<QrLoginStart> {
  const response = await apiFetch("/v1/auth/qr/challenges", {
    method: "POST",
    body: JSON.stringify({ device }),
  });
  return response.json() as Promise<QrLoginStart>;
}

export async function pollQrLogin(challengeId: string, pollToken: string): Promise<QrLoginStatus> {
  const response = await apiFetch("/v1/auth/qr/challenges/status", {
    method: "POST",
    body: JSON.stringify({ challengeId, pollToken }),
  });
  return response.json() as Promise<QrLoginStatus>;
}

export async function signInWithPassword(
  email: string,
  password: string,
  device: DeviceInfo = webDeviceInfo(),
): Promise<AuthSession> {
  const response = await apiFetch("/v1/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email, password, device }),
  });
  return response.json() as Promise<AuthSession>;
}

export async function refreshSession(): Promise<void> {
  await apiFetch("/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getMe(): Promise<SessionUser> {
  const response = await apiFetch("/v1/users/me");
  const data = (await response.json()) as SessionUser & {
    permissions?: string[];
    groups?: SessionGroup[];
  };

  return {
    ...data,
    permissions: data.permissions ?? [],
    groups: data.groups,
  };
}

export async function signOutRequest(): Promise<void> {
  await apiFetch("/v1/auth/sign-out", { method: "POST" });
}
