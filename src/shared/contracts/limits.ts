/**
 * Default public TPO limits — keep in sync with `@twilite/contracts@1.0.0`
 * (`twilite-backend/packages/contracts/src/limits.ts`).
 * Runtime UX prefers `GET /v1/tpg/pixel-objects/limits`; these are fallbacks.
 */
export type PixelObjectLimits = {
  canvasMax: number;
  maxFrames: number;
  sheetMaxBytes: number;
  minFrameDurationMs: number;
  maxFrameDurationMs: number;
  titleMax: number;
  surfaceMax: number;
  objectsPerProject: number;
  projectsPerUser: number;
  projectTitleMax: number;
  supportedFormat: "twilite.pixelobject/v1";
};

export const DEFAULT_PIXEL_OBJECT_LIMITS = {
  canvasMax: 70,
  maxFrames: 64,
  sheetMaxBytes: 8 * 1024 * 1024,
  minFrameDurationMs: 16,
  maxFrameDurationMs: 10_000,
  titleMax: 80,
  surfaceMax: 500,
  objectsPerProject: 100,
  projectsPerUser: 50,
  projectTitleMax: 80,
  supportedFormat: "twilite.pixelobject/v1",
} as const satisfies PixelObjectLimits;

export const PIXEL_OBJECT_FORMAT = DEFAULT_PIXEL_OBJECT_LIMITS.supportedFormat;
