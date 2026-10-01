import { MAX_FRAMES, MAX_SHEET_BYTES } from "./constants";

export function submitBlocker(input: {
  title: string;
  frameCount: number;
  opaque: boolean;
  canSubmit: boolean;
}): string | null {
  if (!input.canSubmit) {
    return "Недостаточно прав, чтобы отправить объект на модерацию.";
  }
  if (input.title.trim().length === 0) {
    return "Укажите название.";
  }
  if (!input.opaque) {
    return "Нужен хотя бы один непрозрачный пиксель.";
  }
  if (input.frameCount < 1 || input.frameCount > MAX_FRAMES) {
    return `Не больше ${MAX_FRAMES} кадров.`;
  }
  return null;
}

export function sheetTooLarge(byteSize: number): boolean {
  return byteSize > MAX_SHEET_BYTES;
}
