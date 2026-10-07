import { apiFetch } from "@/shared/api/http";

/** PUT file bytes to an API upload path from a media ticket. */
export async function putApiUpload(
  uploadUrl: string,
  file: Blob,
  headers: { "Content-Type": string; "Cache-Control"?: string },
): Promise<void> {
  const requestHeaders = new Headers();
  requestHeaders.set("Content-Type", headers["Content-Type"]);
  if (headers["Cache-Control"]) {
    requestHeaders.set("Cache-Control", headers["Cache-Control"]);
  }
  await apiFetch(uploadUrl, {
    method: "PUT",
    headers: requestHeaders,
    body: file,
  });
}
