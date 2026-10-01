import { apiFetch } from "@/shared/api/http";
import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import { DEFAULT_PIXEL_OBJECT_LIMITS } from "@/shared/contracts";
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

export type PixelObjectListPage = {
  items: PixelObjectDto[];
  nextCursor: string | null;
};

export type ListPixelObjectsQuery = {
  cursor?: string | null;
  limit?: number;
};

function listQuery(path: string, query?: ListPixelObjectsQuery): string {
  const params = new URLSearchParams();
  if (query?.cursor) {
    params.set("cursor", query.cursor);
  }
  if (typeof query?.limit === "number") {
    params.set("limit", String(query.limit));
  }
  const suffix = params.toString();
  return suffix.length > 0 ? `${path}?${suffix}` : path;
}

async function readListPage(path: string, query?: ListPixelObjectsQuery): Promise<PixelObjectListPage> {
  const response = await apiFetch(listQuery(path, query));
  const data = (await response.json()) as {
    items?: PixelObjectDto[];
    nextCursor?: string | null;
  };
  return {
    items: Array.isArray(data.items) ? data.items : [],
    nextCursor: typeof data.nextCursor === "string" ? data.nextCursor : null,
  };
}

/** @deprecated Prefer listPublishedPixelObjectsPage for cursor pagination. */
export async function listPublishedPixelObjects(): Promise<PixelObjectDto[]> {
  const page = await listPublishedPixelObjectsPage();
  return page.items;
}

export async function listPublishedPixelObjectsPage(
  query?: ListPixelObjectsQuery,
): Promise<PixelObjectListPage> {
  return readListPage("/v1/tpg/pixel-objects", query);
}

export async function getPixelObjectMobile(id: string): Promise<PixelObjectMobileDto> {
  const response = await apiFetch(`/v1/tpg/pixel-objects/${id}/mobile`);
  return response.json() as Promise<PixelObjectMobileDto>;
}

/** @deprecated Prefer listMyPixelObjectsPage for cursor pagination. */
export async function listMyPixelObjects(): Promise<PixelObjectDto[]> {
  const page = await listMyPixelObjectsPage();
  return page.items;
}

export async function listMyPixelObjectsPage(
  query?: ListPixelObjectsQuery,
): Promise<PixelObjectListPage> {
  return readListPage("/v1/tpg/pixel-objects/mine", query);
}

/** @deprecated Prefer listPixelObjectModerationPage for cursor pagination. */
export async function listPixelObjectModeration(): Promise<PixelObjectDto[]> {
  const page = await listPixelObjectModerationPage();
  return page.items;
}

export async function listPixelObjectModerationPage(
  query?: ListPixelObjectsQuery,
): Promise<PixelObjectListPage> {
  return readListPage("/v1/tpg/pixel-objects/moderation", query);
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
  return mapApiErrorMessage(error, "Не удалось отправить объект.");
}

export { DEFAULT_PIXEL_OBJECT_LIMITS };
