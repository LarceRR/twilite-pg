import { apiFetch } from "@/shared/api/http";
import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import { DEFAULT_PIXEL_OBJECT_LIMITS } from "@/shared/contracts";
import type { SubmitTpoManifest } from "@/shared/pixelObject/manifest";
import type { PixelObjectType } from "@/shared/pixelObject/objectType";

export type { PixelObjectType };

export type PixelObjectMobileDto = {
  id: string;
  title: string;
  objectType: PixelObjectType;
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

export type PixelObjectStatus = "pending" | "published" | "rejected" | "archived";

export type PixelObjectDto = {
  id: string;
  projectId: string;
  title: string;
  objectType: PixelObjectType;
  authorDisplayName: string;
  authorUserId: string;
  status: PixelObjectStatus;
  rejectionComment: string | null;
  revision: number;
  manifest: SubmitTpoManifest;
  sheetUrl: string;
  previewUrl?: string | null;
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
  projectId?: string;
};

function listQuery(path: string, query?: ListPixelObjectsQuery): string {
  const params = new URLSearchParams();
  if (query?.cursor) {
    params.set("cursor", query.cursor);
  }
  if (typeof query?.limit === "number") {
    params.set("limit", String(query.limit));
  }
  if (query?.projectId) {
    params.set("projectId", query.projectId);
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

export type DeletePixelObjectResult = {
  outcome: "deleted" | "reassigned";
};

/**
 * Drafts are erased (204). A published object is reassigned to Twilite and stays in the catalog.
 */
export async function deletePixelObject(id: string): Promise<DeletePixelObjectResult> {
  const response = await apiFetch(`/v1/tpg/pixel-objects/${id}`, { method: "DELETE" });
  if (response.status === 204) {
    return { outcome: "deleted" };
  }
  const data = (await response.json()) as { outcome?: unknown };
  return { outcome: data.outcome === "reassigned" ? "reassigned" : "deleted" };
}

export function moderationErrorMessage(error: unknown): string {
  return mapApiErrorMessage(error, "Не удалось отправить объект.");
}

export { DEFAULT_PIXEL_OBJECT_LIMITS };
