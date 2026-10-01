import { ApiError } from "@/shared/api/http";
import {
  collectOpaquePaletteHexes,
  MAX_LAYERS,
  useEditorCanvasStore,
  type LayerOpResult,
} from "@/shared/store/editorCanvas";
import { useEditorPaletteStore } from "@/shared/store/editorPalette";
import { useEditorViewportStore } from "@/shared/store/editorViewport";

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function describePixelateError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "Недостаточно прав для пикселизации";
    }
    return error.message || "Не удалось пикселизовать изображение";
  }
  if (error instanceof TypeError) {
    return "Нет соединения с сервером";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Не удалось пикселизовать изображение";
}

/** Make the document the native grid and copy those pixels 1:1. */
export function commitNativeImport(input: {
  native: Uint8ClampedArray;
  nativeWidth: number;
  nativeHeight: number;
  ontoActive: boolean;
}): LayerOpResult {
  const store = useEditorCanvasStore.getState();
  if (store.isPlaying) {
    return { ok: false, reason: "Остановите воспроизведение" };
  }
  if (store.isDrawing) {
    return { ok: false, reason: "Завершите штрих перед импортом" };
  }
  if (!input.ontoActive && store.layers.length >= MAX_LAYERS) {
    return { ok: false, reason: `Максимум ${MAX_LAYERS} слоёв` };
  }
  if (input.ontoActive) {
    const active = store.layers.find((layer) => layer.id === store.activeLayerId);
    if (!active) {
      return { ok: false, reason: "Слой не найден" };
    }
    if (active.locked) {
      return { ok: false, reason: "Слой заблокирован" };
    }
    if (!active.visible) {
      return { ok: false, reason: "Слой скрыт" };
    }
  }

  const expected = input.nativeWidth * input.nativeHeight * 4;
  if (input.nativeWidth < 1 || input.nativeHeight < 1 || input.native.length !== expected) {
    return { ok: false, reason: "Некорректный размер сетки" };
  }

  const resized = store.resizeDocument(input.nativeWidth, input.nativeHeight);
  if (!resized.ok) {
    return resized;
  }
  useEditorViewportStore.getState().setDocumentSize(input.nativeWidth, input.nativeHeight);

  const result = useEditorCanvasStore
    .getState()
    .importPixels(input.native, input.ontoActive ? "active" : "new-layer");
  if (result.ok) {
    useEditorPaletteStore.getState().mergeColors(collectOpaquePaletteHexes(input.native), "import");
  }
  return result;
}
