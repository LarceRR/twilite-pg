/** Encode an RGBA buffer as PNG. Nearest-neighbor is already applied to the buffer. */
export function pixelsToPngBlob(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("2D canvas context unavailable"));
  }
  context.imageSmoothingEnabled = false;
  context.putImageData(toImageData(pixels, width, height), 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Не удалось собрать PNG"));
      }
    }, "image/png");
  });
}

/** ImageData in the DOM lib requires a buffer backed by ArrayBuffer, not SharedArrayBuffer. */
export function toImageData(pixels: Uint8ClampedArray, width: number, height: number): ImageData {
  const buffer = new ArrayBuffer(pixels.byteLength);
  const data = new Uint8ClampedArray(buffer);
  data.set(pixels);
  return new ImageData(data, width, height);
}

export async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}
