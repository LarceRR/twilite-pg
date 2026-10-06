import type { PixelObjectDto } from "@/shared/api/pixelObjects";
import { unpackSheet } from "@/shared/pixelObject/pixels";
import { useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { useEditorViewportStore } from "@/shared/store/editorViewport";
import { usePixelObjectEditStore } from "@/shared/store/pixelObjectEdit";

async function decodeSheetPng(url: string): Promise<{
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Не удалось скачать spritesheet (${response.status})`);
  }
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("2D canvas context unavailable");
  }
  context.imageSmoothingEnabled = false;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return { pixels: image.data, width: canvas.width, height: canvas.height };
}

function durationsFromManifest(item: PixelObjectDto): number[] {
  const frames = item.manifest.animations[0]?.frames ?? [];
  return Array.from({ length: item.manifest.sheet.frameCount }, (_, index) => {
    const found = frames.find((entry) => entry.frame === index);
    return found?.durationMs ?? 100;
  });
}

/**
 * Load rejected/published object into the editor for PATCH resubmit.
 * Preserves title; never assumes the previous published head disappears.
 */
export async function loadPixelObjectIntoEditor(item: PixelObjectDto): Promise<void> {
  if (item.status === "pending") {
    throw new Error("Объект на модерации — дождитесь решения, затем правьте при отклонении.");
  }

  const sheet = await decodeSheetPng(item.sheetUrl);
  const { canvas, sheet: geometry } = item.manifest;
  if (sheet.width !== geometry.frameWidth * geometry.columns) {
    throw new Error("Ширина spritesheet не совпадает с манифестом");
  }
  if (sheet.height !== geometry.frameHeight * geometry.rows) {
    throw new Error("Высота spritesheet не совпадает с манифестом");
  }

  const frames = unpackSheet({
    pixels: sheet.pixels,
    sheetWidth: sheet.width,
    sheetHeight: sheet.height,
    frameWidth: geometry.frameWidth,
    frameHeight: geometry.frameHeight,
    columns: geometry.columns,
    frameCount: geometry.frameCount,
  });
  const durations = durationsFromManifest(item);

  const resized = useEditorCanvasStore.getState().resizeDocument(canvas.width, canvas.height);
  if (!resized.ok) {
    throw new Error(resized.reason);
  }
  useEditorViewportStore.getState().setDocumentSize(canvas.width, canvas.height);

  const imported = useEditorCanvasStore
    .getState()
    .importStoryboardFrames(frames, "replace", durations[0]);
  if (!imported.ok) {
    throw new Error(imported.reason);
  }

  useEditorCanvasStore.getState().frames.forEach((frame, index) => {
    const duration = durations[index];
    if (typeof duration === "number") {
      useEditorCanvasStore.getState().setFrameDuration(frame.id, duration);
    }
  });

  usePixelObjectEditStore.getState().setEditingObject({
    id: item.id,
    projectId: item.projectId,
    title: item.title,
    status: item.status,
  });
}
