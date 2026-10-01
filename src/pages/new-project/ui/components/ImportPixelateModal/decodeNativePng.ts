import { clonePixels } from "@/shared/store/editorCanvas";

/** Decode the 1:1 native PNG. The upscaled preview is never used for placement. */
export async function decodeNativePng(
  base64: string,
  width: number,
  height: number,
): Promise<Uint8ClampedArray<ArrayBuffer>> {
  if (width < 1 || height < 1) {
    throw new Error("Некорректный размер native-сетки");
  }

  const image = new Image();
  image.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Не удалось прочитать native PNG"));
    image.src = `data:image/png;base64,${base64}`;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("2D canvas context unavailable");
  }
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, width, height);
  return clonePixels(context.getImageData(0, 0, width, height).data);
}
