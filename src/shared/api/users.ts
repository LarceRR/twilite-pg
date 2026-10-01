import { apiFetch } from "@/shared/api/http";
import type { SessionUser } from "@/shared/api/auth";

export type AvatarContentType = "image/jpeg" | "image/png" | "image/webp";

export type AvatarUploadTicket = {
  assetId: string;
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
  headers: {
    "Content-Type": string;
    "Cache-Control": string;
  };
};

export async function createAvatarUpload(input: {
  contentType: AvatarContentType;
  byteSize: number;
}): Promise<AvatarUploadTicket> {
  const response = await apiFetch("/v1/users/me/avatar", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.json() as Promise<AvatarUploadTicket>;
}

/** Bytes go straight to R2 — do not use apiFetch (wrong host / extra headers break the signature). */
export async function putAvatarToStorage(
  ticket: AvatarUploadTicket,
  file: Blob,
): Promise<void> {
  const response = await fetch(ticket.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": ticket.headers["Content-Type"],
      "Cache-Control": ticket.headers["Cache-Control"],
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить файл (${response.status})`);
  }
}

export async function confirmAvatarUpload(assetId: string): Promise<SessionUser> {
  const response = await apiFetch(`/v1/users/me/avatar/${assetId}/confirm`, {
    method: "POST",
  });
  const data = (await response.json()) as SessionUser & {
    permissions?: string[];
  };

  return {
    ...data,
    permissions: data.permissions ?? [],
  };
}

export async function updateProfile(patch: {
  displayName?: string;
  avatarUrl?: string | null;
}): Promise<SessionUser> {
  const response = await apiFetch("/v1/users/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const data = (await response.json()) as SessionUser & {
    permissions?: string[];
  };

  return {
    ...data,
    permissions: data.permissions ?? [],
  };
}

export async function uploadAvatarFile(file: File): Promise<SessionUser> {
  const contentType = file.type as AvatarContentType;

  if (contentType !== "image/jpeg" && contentType !== "image/png" && contentType !== "image/webp") {
    throw new Error("Поддерживаются JPEG, PNG и WebP");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Файл больше 2 МБ");
  }

  const ticket = await createAvatarUpload({
    contentType,
    byteSize: file.size,
  });
  await putAvatarToStorage(ticket, file);
  return confirmAvatarUpload(ticket.assetId);
}
