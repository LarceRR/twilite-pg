/** Canonical delivery format. GIF/APNG are artist downloads only. */
import { DEFAULT_PIXEL_OBJECT_LIMITS, PIXEL_OBJECT_FORMAT } from "@/shared/contracts";

export const TPO_FORMAT = PIXEL_OBJECT_FORMAT;

/** Matches backend production limits (overridable via GET /limits). */
export const MAX_FRAMES = DEFAULT_PIXEL_OBJECT_LIMITS.maxFrames;

/** Matches backend production sheet byte cap (overridable via GET /limits). */
export const MAX_SHEET_BYTES = DEFAULT_PIXEL_OBJECT_LIMITS.sheetMaxBytes;

export const DEFAULT_FRAME_DURATION_MS = 100;
export const MIN_FRAME_DURATION_MS = DEFAULT_PIXEL_OBJECT_LIMITS.minFrameDurationMs;
export const MAX_FRAME_DURATION_MS = DEFAULT_PIXEL_OBJECT_LIMITS.maxFrameDurationMs;

export const EXPORT_SCALES = [1, 2, 4, 8] as const;
export type ExportScale = (typeof EXPORT_SCALES)[number];
