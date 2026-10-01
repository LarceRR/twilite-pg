/** Canonical delivery format. GIF/APNG are artist downloads only. */
export const TPO_FORMAT = "twilite.pixelobject/v1" as const;

/** Matches backend production `LIMIT_TPG_PIXEL_OBJECT_MAX_FRAMES`. */
export const MAX_FRAMES = 64;

/** Matches backend production `LIMIT_TPG_PIXEL_OBJECT_SHEET_MAX_BYTES`. */
export const MAX_SHEET_BYTES = 8 * 1024 * 1024;

export const DEFAULT_FRAME_DURATION_MS = 100;
export const MIN_FRAME_DURATION_MS = 16;
export const MAX_FRAME_DURATION_MS = 10_000;

export const EXPORT_SCALES = [1, 2, 4, 8] as const;
export type ExportScale = (typeof EXPORT_SCALES)[number];
