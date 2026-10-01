import { MAX_FRAMES } from "@/shared/pixelObject/constants";
import {
  blitNativeRect,
  collectOpaquePaletteHexes,
  MAX_LAYERS,
  snapRect,
  useEditorCanvasStore,
  type LayerOpResult,
  type NativeCropRect,
} from "@/shared/store/editorCanvas";
import { useEditorPaletteStore } from "@/shared/store/editorPalette";
import { useEditorViewportStore } from "@/shared/store/editorViewport";

/** All frames share the first crop. A smaller crop sits at the top-left of that field. */
export function commitStoryboardImport(input: {
  rects: readonly NativeCropRect[];
  native: Uint8ClampedArray;
  nativeWidth: number;
  nativeHeight: number;
  mode: "replace" | "append";
  frameDurationMs: number;
}): LayerOpResult {
  if (input.rects.length < 1) {
    return { ok: false, reason: "Нужен хотя бы один кадр" };
  }
  if (input.rects.length > MAX_FRAMES) {
    return { ok: false, reason: `Максимум ${MAX_FRAMES} кадров` };
  }

  const frame = snapRect(input.rects[0]!);
  const frameWidth = frame.w;
  const frameHeight = frame.h;
  for (const rect of input.rects) {
    const snapped = snapRect(rect);
    if (snapped.w > frameWidth || snapped.h > frameHeight) {
      return { ok: false, reason: "Кадр больше размера первого кадра" };
    }
  }

  const store = useEditorCanvasStore.getState();
  if (store.isPlaying) {
    return { ok: false, reason: "Остановите воспроизведение" };
  }
  if (store.isDrawing) {
    return { ok: false, reason: "Завершите штрих перед импортом" };
  }
  if (input.mode === "append" && store.frames.length + input.rects.length > MAX_FRAMES) {
    return {
      ok: false,
      reason: `Максимум ${MAX_FRAMES} кадров (можно добавить ${MAX_FRAMES - store.frames.length})`,
    };
  }
  if (input.mode === "append" && store.layers.length >= MAX_LAYERS) {
    return { ok: false, reason: `Максимум ${MAX_LAYERS} слоёв` };
  }
  if (
    input.mode === "append" &&
    (store.width !== frameWidth || store.height !== frameHeight)
  ) {
    return {
      ok: false,
      reason: `Кадры ${frameWidth}×${frameHeight} не совпадают с холстом ${store.width}×${store.height}`,
    };
  }

  let framePixels: Uint8ClampedArray<ArrayBuffer>[];
  try {
    framePixels = input.rects.map((rect) =>
      blitNativeRect(input.native, input.nativeWidth, input.nativeHeight, rect, frameWidth, frameHeight),
    );
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Не удалось собрать кадр",
    };
  }

  if (input.mode === "replace") {
    const resized = store.resizeDocument(frameWidth, frameHeight);
    if (!resized.ok) {
      return resized;
    }
    useEditorViewportStore.getState().setDocumentSize(frameWidth, frameHeight);
  }

  const result = useEditorCanvasStore
    .getState()
    .importStoryboardFrames(framePixels, input.mode, input.frameDurationMs);
  if (result.ok) {
    const hexes = new Set<string>();
    for (const pixels of framePixels) {
      for (const hex of collectOpaquePaletteHexes(pixels)) {
        hexes.add(hex);
      }
    }
    useEditorPaletteStore.getState().mergeColors([...hexes], "import");
  }
  return result;
}
