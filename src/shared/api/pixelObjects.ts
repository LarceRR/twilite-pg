import { apiFetch, ApiError } from "@/shared/api/http";
import { MAX_SHEET_BYTES } from "@/shared/pixelObject/constants";
import type { SubmitTpoManifest } from "@/shared/pixelObject/manifest";

export type PixelObjectMobileDto = {
  id: string;
  title: string;
  format: string;
  sheetUrl: string;
  canvas: { width: number; height: number };
  sheet: {
    frameWidth: number;
    frameHeight: number;
    columns: number;
    rows: number;
    frameCount: number;
  };
  animations: SubmitTpoManifest["animations"];
  staticPreviewFrame: number;
};

export type PixelObjectStatus = "pending" | "published" | "rejected";

export type PixelObjectDto = {
  id: string;
  title: string;
  authorDisplayName: string;
  authorUserId: string;
  status: PixelObjectStatus;
  rejectionComment: string | null;
  revision: number;
  manifest: SubmitTpoManifest;
  sheetUrl: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

type UploadTicket = {
  assetId: string;
  uploadUrl: string;
  headers: {
    "Content-Type": string;
    "Cache-Control": string;
  };
};

export async function uploadPixelSheet(sheet: Blob): Promise<string> {
  if (sheet.size > MAX_SHEET_BYTES) {
    throw new Error("Spritesheet слишком большой.");
  }

  const ticketResponse = await apiFetch("/v1/media/uploads", {
    method: "POST",
    body: JSON.stringify({
      kind: "pixel-sheet",
      contentType: "image/png",
      byteSize: sheet.size,
    }),
  });
  const ticket = (await ticketResponse.json()) as UploadTicket;

  const upload = await fetch(ticket.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": ticket.headers["Content-Type"],
      "Cache-Control": ticket.headers["Cache-Control"],
    },
    body: sheet,
  });
  if (!upload.ok) {
    throw new Error(`Не удалось загрузить spritesheet (${upload.status})`);
  }

  await apiFetch(`/v1/media/uploads/${ticket.assetId}/confirm`, { method: "POST" });
  return ticket.assetId;
}

export async function submitPixelObject(input: {
  title: string;
  manifest: SubmitTpoManifest;
}): Promise<PixelObjectDto> {
  const response = await apiFetch("/v1/tpg/pixel-objects", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.json() as Promise<PixelObjectDto>;
}

export async function resubmitPixelObject(
  id: string,
  input: { title: string; manifest: SubmitTpoManifest },
): Promise<PixelObjectDto> {
  const response = await apiFetch(`/v1/tpg/pixel-objects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.json() as Promise<PixelObjectDto>;
}

export async function listPublishedPixelObjects(): Promise<PixelObjectDto[]> {
  const response = await apiFetch("/v1/tpg/pixel-objects");
  const data = (await response.json()) as { items: PixelObjectDto[] };
  return data.items;
}

export async function getPixelObjectMobile(id: string): Promise<PixelObjectMobileDto> {
  const response = await apiFetch(`/v1/tpg/pixel-objects/${id}/mobile`);
  return response.json() as Promise<PixelObjectMobileDto>;
}

export async function listMyPixelObjects(): Promise<PixelObjectDto[]> {
  const response = await apiFetch("/v1/tpg/pixel-objects/mine");
  const data = (await response.json()) as { items: PixelObjectDto[] };
  return data.items;
}

export async function listPixelObjectModeration(): Promise<PixelObjectDto[]> {
  const response = await apiFetch("/v1/tpg/pixel-objects/moderation");
  const data = (await response.json()) as { items: PixelObjectDto[] };
  return data.items;
}

export async function publishPixelObject(id: string): Promise<PixelObjectDto> {
  const response = await apiFetch(`/v1/tpg/pixel-objects/${id}/publish`, { method: "POST" });
  return response.json() as Promise<PixelObjectDto>;
}

export async function rejectPixelObject(id: string, comment: string): Promise<PixelObjectDto> {
  const response = await apiFetch(`/v1/tpg/pixel-objects/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
  return response.json() as Promise<PixelObjectDto>;
}

export function moderationErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return "Недостаточно прав, чтобы отправить объект на модерацию.";
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Не удалось отправить объект.";
}
