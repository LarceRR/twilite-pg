import {
  PIXELATE_DEFAULT_ALGORITHM,
  PIXELATE_DEFAULT_PALETTE_SIZE,
  PIXELATE_DEFAULT_PIXEL_SIZE,
  TPG_IMAGE_MAX_BYTES,
} from "@/shared/api/tpg";

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/webp",
  "image/gif",
]);

export type ImagePreview = {
  url: string;
  width: number;
  height: number;
  mimeType: string;
  name: string;
  size: number;
};

export type ClassifiedImportFile =
  | { ok: true; file: File }
  | { ok: false; reason: string };

export type ImportPixelateRequest =
  | { kind: "file"; file: File }
  | { kind: "rejected"; reason: string };

export const DEFAULT_IMPORT_SETTINGS = {
  pixelSize: PIXELATE_DEFAULT_PIXEL_SIZE,
  paletteSize: PIXELATE_DEFAULT_PALETTE_SIZE,
  algorithm: PIXELATE_DEFAULT_ALGORITHM,
} as const;

export function pickImportFile(files: FileList | readonly File[] | null): File | null {
  if (!files || files.length === 0) {
    return null;
  }
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      return file;
    }
  }
  return files[0] ?? null;
}

export function classifyImportFile(file: File | null): ClassifiedImportFile {
  if (!file) {
    return { ok: false, reason: "Файл не является изображением" };
  }
  if (file.type && !ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, reason: "Поддерживаются PNG, JPEG, WebP и GIF" };
  }
  if (file.size <= 0) {
    return { ok: false, reason: "Файл пустой" };
  }
  if (file.size > TPG_IMAGE_MAX_BYTES) {
    return { ok: false, reason: `Файл больше ${formatByteSize(TPG_IMAGE_MAX_BYTES)}` };
  }
  return { ok: true, file };
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} Б`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} КБ`;
  }
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} МБ`;
}

export function loadImagePreview(file: File): Promise<ImagePreview> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
        mimeType: file.type || "image/*",
        name: file.name || "image",
        size: file.size,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Файл не является изображением"));
    };
    image.src = url;
  });
}

export function fileFromClipboard(data: DataTransfer | null): File | null {
  if (!data) {
    return null;
  }
  const picked = pickImportFile(data.files);
  if (picked) {
    return picked;
  }
  for (const item of data.items) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) {
      continue;
    }
    return item.getAsFile();
  }
  return null;
}

export function isEditablePasteTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
