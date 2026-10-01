import type { SelectionClipboard } from "./selection";
import type { ExtractedSelection } from "./selectionTransform";
import { cloneMask } from "./selectionMask";

export function clipboardFromExtract(
  extract: ExtractedSelection,
): SelectionClipboard {
  return {
    pixels: new Uint8ClampedArray(extract.pixels),
    mask: cloneMask(extract.mask),
    width: extract.width,
    height: extract.height,
  };
}

export function cloneClipboard(
  clipboard: SelectionClipboard,
): SelectionClipboard {
  return {
    pixels: new Uint8ClampedArray(clipboard.pixels),
    mask: cloneMask(clipboard.mask),
    width: clipboard.width,
    height: clipboard.height,
  };
}

/**
 * Center paste origin on canvas; subsequent spam pastes offset +1,+1 from last origin.
 * Keeps bbox intersecting the canvas.
 */
export function computePasteOrigin(
  clipW: number,
  clipH: number,
  canvasW: number,
  canvasH: number,
  previousOrigin: { x: number; y: number } | null,
  spamOffset: boolean,
): { x: number; y: number } {
  if (spamOffset && previousOrigin) {
    let x = previousOrigin.x + 1;
    let y = previousOrigin.y + 1;
    // Keep at least 1px intersection with canvas.
    if (x >= canvasW) x = canvasW - 1;
    if (y >= canvasH) y = canvasH - 1;
    if (x + clipW <= 0) x = 1 - clipW;
    if (y + clipH <= 0) y = 1 - clipH;
    return { x, y };
  }

  return {
    x: Math.round((canvasW - clipW) / 2),
    y: Math.round((canvasH - clipH) / 2),
  };
}
