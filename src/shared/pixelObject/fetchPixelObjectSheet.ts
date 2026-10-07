import { apiFetch } from "@/shared/api/http";

/** GET the spritesheet from the API (`/v1/tpg/pixel-objects/:id/revisions/:revision/sheet`). */
export async function fetchPixelObjectSheet(
  sheetUrl: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await apiFetch(sheetUrl, signal ? { signal } : undefined);
  return response.blob();
}
