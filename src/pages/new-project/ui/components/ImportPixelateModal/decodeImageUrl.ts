import { clonePixels } from "@/shared/store/editorCanvas";

/** Read a preview URL as a 1:1 pixel buffer. Used when the file is already pixel art. */
export async function decodeImageUrl(
  url: string,
  width: number,
  height: number,
): Promise<Uint8ClampedArray<ArrayBuffer>> {
  if (width < 1 || height < 1) {
    throw new Error("Некорректный размер изображения");
  }

  const image = new Image();
  image.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    image.src = url;
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
