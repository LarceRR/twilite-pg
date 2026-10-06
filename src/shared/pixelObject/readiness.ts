import { DEFAULT_PIXEL_OBJECT_LIMITS } from "@/shared/contracts";
import { canvasOversizeReason, exceedsCanvasMax } from "./canvasFit";

export function submitBlocker(input: {
  title: string;
  frameCount: number;
  opaque: boolean;
  canSubmit: boolean;
  projectId?: string | null;
  width?: number;
  height?: number;
  canvasMax?: number;
  maxFrames?: number;
  titleMax?: number;
}): string | null {
  const canvasMax = input.canvasMax ?? DEFAULT_PIXEL_OBJECT_LIMITS.canvasMax;
  const maxFrames = input.maxFrames ?? DEFAULT_PIXEL_OBJECT_LIMITS.maxFrames;
  const titleMax = input.titleMax ?? DEFAULT_PIXEL_OBJECT_LIMITS.titleMax;

  if (!input.canSubmit) {
    return "Недостаточно прав, чтобы отправить объект на модерацию.";
  }
  if (!input.projectId) {
    return "Выберите проект: откройте редактор из карточки проекта.";
  }
  const title = input.title.trim();
  if (title.length === 0) {
    return "Укажите название.";
  }
  if (title.length > titleMax) {
    return `Название длиннее ${titleMax} символов.`;
  }
  if (!input.opaque) {
    return "Нужен хотя бы один непрозрачный пиксель.";
  }
  if (input.frameCount < 1 || input.frameCount > maxFrames) {
    return `Не больше ${maxFrames} кадров.`;
  }
  if (
    typeof input.width === "number" &&
    typeof input.height === "number" &&
    exceedsCanvasMax({ width: input.width, height: input.height }, canvasMax)
  ) {
    return canvasOversizeReason({ width: input.width, height: input.height }, canvasMax);
  }
  return null;
}

export function sheetTooLarge(byteSize: number, sheetMaxBytes = DEFAULT_PIXEL_OBJECT_LIMITS.sheetMaxBytes): boolean {
  return byteSize > sheetMaxBytes;
}
