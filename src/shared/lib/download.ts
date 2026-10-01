/** Trigger a browser download from a data URL or object URL. */
export function downloadHref(href: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
}

/** Trigger a browser download from a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  try {
    downloadHref(objectUrl, filename);
  } finally {
    // Defer revoke so the browser can start the download.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }
}
