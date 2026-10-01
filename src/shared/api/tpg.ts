import { apiFetch, ApiError } from "@/shared/api/http";
import { hasPermission, TPG_PERMISSIONS } from "@/shared/lib/rbac";
import { useSessionStore } from "@/shared/store/session/model/sessionStore";

export const PIXEL_ART_ALGORITHMS = [
  "nearest",
  "quantize",
  "center",
  "bayer",
  "floyd-steinberg",
  "atkinson",
] as const;

export type PixelArtAlgorithm = (typeof PIXEL_ART_ALGORITHMS)[number];

export const ALGORITHM_LABELS: Record<PixelArtAlgorithm, string> = {
  nearest: "Nearest",
  quantize: "Quantize",
  center: "Center",
  bayer: "Bayer",
  "floyd-steinberg": "Floyd–Steinberg",
  atkinson: "Atkinson",
};

export const ALGORITHM_HINTS: Record<PixelArtAlgorithm, string> = {
  nearest:
    "Цвет каждого блока берётся из одного угла. Палитра не сужается. Быстро, на градиентах видны ступеньки.",
  quantize:
    "Блок усредняется и подгоняется под выбранную палитру. Ровные заливки, обычный пиксель-арт.",
  center:
    "Цвет берётся из центра блока и тоже сводится к палитре. Контуры жёстче, чем у Quantize.",
  bayer: "К цветам добавляется ровная сетка точек. Полутона выглядят как ретро-экран.",
  "floyd-steinberg":
    "Ошибка цвета переносится на соседние пиксели. Переходы мягче, картинка зернистая.",
  atkinson:
    "Ошибка рассеивается слабее, чем у Floyd–Steinberg. Картинка контрастнее и светлее.",
};

/** Algorithms that ignore the palette slider. */
export const ALGORITHM_USES_PALETTE: Record<PixelArtAlgorithm, boolean> = {
  nearest: false,
  quantize: true,
  center: true,
  bayer: true,
  "floyd-steinberg": true,
  atkinson: true,
};

export type PixelateResult = {
  mimeType: "image/png";
  width: number;
  height: number;
  imageBase64: string;
  nativeWidth: number;
  nativeHeight: number;
  nativeBase64: string;
  pixelSize: number;
  paletteSize: number;
  algorithm: PixelArtAlgorithm;
};

/** Matches the backend production limit `LIMIT_TPG_IMAGE_MAX_BYTES`. */
export const TPG_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const PIXELATE_MIN_PIXEL_SIZE = 2;
export const PIXELATE_MAX_PIXEL_SIZE = 100;
export const PIXELATE_MIN_PALETTE_SIZE = 2;
export const PIXELATE_MAX_PALETTE_SIZE = 64;
export const PIXELATE_DEFAULT_PIXEL_SIZE = 8;
export const PIXELATE_DEFAULT_PALETTE_SIZE = 24;
export const PIXELATE_DEFAULT_ALGORITHM: PixelArtAlgorithm = "quantize";

export type PixelateOptions = {
  pixelSize?: number;
  algorithm?: PixelArtAlgorithm;
  paletteSize?: number;
  signal?: AbortSignal;
};

/** Soft client-side gate before pixelate calls (server still enforces). */
function assertCanPixelate(): void {
  const permissions = useSessionStore.getState().user?.permissions ?? [];
  if (!hasPermission(permissions, TPG_PERMISSIONS.PIXELATE_USE)) {
    throw new ApiError("Недостаточно прав для пикселизации", 403, null);
  }
}

/** Upload a local file to TPG. */
export async function pixelateFromFile(
  file: File,
  options: PixelateOptions = {},
): Promise<PixelateResult> {
  assertCanPixelate();

  const form = new FormData();
  form.append("image", file);
  if (options.pixelSize !== undefined) {
    form.append("pixelSize", String(options.pixelSize));
  }
  if (options.algorithm !== undefined) {
    form.append("algorithm", options.algorithm);
  }
  if (options.paletteSize !== undefined) {
    form.append("paletteSize", String(options.paletteSize));
  }

  const response = await apiFetch("/v1/tpg/pixelate/upload", {
    method: "POST",
    body: form,
    signal: options.signal,
  });

  return response.json() as Promise<PixelateResult>;
}

/** Ask the backend to fetch an image URL and pixelate it. */
export async function pixelateFromUrl(
  imageUrl: string,
  options: PixelateOptions = {},
): Promise<PixelateResult> {
  assertCanPixelate();

  const response = await apiFetch("/v1/tpg/pixelate/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      pixelSize: options.pixelSize ?? PIXELATE_DEFAULT_PIXEL_SIZE,
      algorithm: options.algorithm ?? PIXELATE_DEFAULT_ALGORITHM,
      paletteSize: options.paletteSize ?? PIXELATE_DEFAULT_PALETTE_SIZE,
    }),
    signal: options.signal,
  });

  return response.json() as Promise<PixelateResult>;
}

export function toDataUrl(result: PixelateResult): string {
  return `data:${result.mimeType};base64,${result.imageBase64}`;
}

export function toNativeDataUrl(result: PixelateResult): string {
  return `data:${result.mimeType};base64,${result.nativeBase64}`;
}

/** Upscaled preview download. */
export function downloadPixelArt(result: PixelateResult, filename = "pixel-art.png"): void {
  triggerDownload(toDataUrl(result), filename);
}

/** True 1:1 grid download for Aseprite / game engines. */
export function downloadNativePixelArt(
  result: PixelateResult,
  filename = "pixel-art-1x.png",
): void {
  triggerDownload(toNativeDataUrl(result), filename);
}

function triggerDownload(href: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
}
