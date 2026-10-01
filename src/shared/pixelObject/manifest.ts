import {
  DEFAULT_FRAME_DURATION_MS,
  MAX_FRAME_DURATION_MS,
  MIN_FRAME_DURATION_MS,
  TPO_FORMAT,
} from "./constants";
import type { PackedSheet } from "./pixels";

export type TpoFrameRef = {
  frame: number;
  durationMs: number;
};

export type LocalTpoManifest = {
  format: typeof TPO_FORMAT;
  canvas: { width: number; height: number };
  sheet: {
    file: "sheet.png";
    frameWidth: number;
    frameHeight: number;
    columns: number;
    rows: number;
    frameCount: number;
  };
  animations: [
    {
      id: "default";
      loop: true;
      frames: TpoFrameRef[];
    },
  ];
  staticPreviewFrame: 0;
};

export type SubmitTpoManifest = {
  format: typeof TPO_FORMAT;
  canvas: { width: number; height: number };
  sheet: {
    mediaId: string;
    frameWidth: number;
    frameHeight: number;
    columns: number;
    rows: number;
    frameCount: number;
  };
  animations: LocalTpoManifest["animations"];
  staticPreviewFrame: 0;
};

export function clampDurationMs(durationMs: number): number {
  if (!Number.isFinite(durationMs)) {
    return DEFAULT_FRAME_DURATION_MS;
  }
  return Math.max(MIN_FRAME_DURATION_MS, Math.min(MAX_FRAME_DURATION_MS, Math.round(durationMs)));
}

/** Build a local manifest whose frame list matches the packed sheet. */
export function buildLocalManifest(input: {
  width: number;
  height: number;
  sheet: PackedSheet;
  durationsMs: readonly number[];
}): LocalTpoManifest {
  const frameCount = input.durationsMs.length;
  if (frameCount < 1 || frameCount > input.sheet.columns * input.sheet.rows) {
    throw new Error("Сетка spritesheet меньше числа кадров");
  }
  if (input.sheet.width !== input.width * input.sheet.columns || input.sheet.height !== input.height * input.sheet.rows) {
    throw new Error("Размер sheet не совпадает с холстом");
  }

  return {
    format: TPO_FORMAT,
    canvas: { width: input.width, height: input.height },
    sheet: {
      file: "sheet.png",
      frameWidth: input.width,
      frameHeight: input.height,
      columns: input.sheet.columns,
      rows: input.sheet.rows,
      frameCount,
    },
    animations: [
      {
        id: "default",
        loop: true,
        frames: input.durationsMs.map((durationMs, frame) => ({
          frame,
          durationMs: clampDurationMs(durationMs),
        })),
      },
    ],
    staticPreviewFrame: 0,
  };
}

export function toSubmitManifest(local: LocalTpoManifest, mediaId: string): SubmitTpoManifest {
  return {
    format: local.format,
    canvas: local.canvas,
    sheet: {
      mediaId,
      frameWidth: local.sheet.frameWidth,
      frameHeight: local.sheet.frameHeight,
      columns: local.sheet.columns,
      rows: local.sheet.rows,
      frameCount: local.sheet.frameCount,
    },
    animations: local.animations,
    staticPreviewFrame: 0,
  };
}

export function fileSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug.slice(0, 40) : "pixel-object";
}
