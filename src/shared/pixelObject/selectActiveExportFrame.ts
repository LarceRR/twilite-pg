import type { ExportFrame } from "./capture";

/**
 * Picks the active frame for single-frame PNG export.
 * Falls back to index 0 when the active index is out of range.
 */
export function selectActiveExportFrame(
  frames: readonly ExportFrame[],
  activeIndex: number,
): ExportFrame | undefined {
  if (frames.length === 0) {
    return undefined;
  }
  if (activeIndex < 0 || activeIndex >= frames.length) {
    return frames[0];
  }
  return frames[activeIndex];
}

export function activeFrameIndexFromIds(
  frameIds: readonly string[],
  activeFrameId: string | null | undefined,
): number {
  if (!activeFrameId) {
    return 0;
  }
  const index = frameIds.indexOf(activeFrameId);
  return index < 0 ? 0 : index;
}
