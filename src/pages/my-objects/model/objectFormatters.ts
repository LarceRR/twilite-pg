import type { PixelObjectDto, PixelObjectStatus } from "@/shared/api/pixelObjects";
import { PIXEL_OBJECT_TYPE_LABEL } from "@/shared/pixelObject/objectType";

import { OBJECT_CATEGORIES, type ObjectCategoryId, type ObjectStatusFilter } from "./objectCategories";

export const MY_OBJECTS_TITLE = "Мои объекты";

const EMPTY_HERO_IMAGES = [
  "/new-project/new-project-1.png",
  "/new-project/new-project-2.png",
  "/new-project/new-project-3.png",
  "/new-project/new-project-4.png",
  "/new-project/new-project-5.png",
  "/new-project/new-project-6.png",
] as const;

export const OBJECT_STATUS_LABEL: Record<PixelObjectStatus, string> = {
  pending: "На модерации",
  published: "Опубликован",
  rejected: "Отклонён",
  archived: "В архиве",
};

export function pickEmptyHero(random = Math.random): string {
  const index = Math.floor(random() * EMPTY_HERO_IMAGES.length);
  return EMPTY_HERO_IMAGES[index] ?? EMPTY_HERO_IMAGES[0];
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
}

export function formatObjectCount(n: number): string {
  return `${n} ${pluralRu(n, "объект", "объекта", "объектов")}`;
}

export function resolveObjectsTitle(projectId: string | null, projectTitle: string | null): string {
  const trimmed = projectTitle?.trim() ?? "";
  if (projectId && trimmed) {
    return trimmed;
  }
  return MY_OBJECTS_TITLE;
}

/** Instant title passed from a project card: `{ projectTitle }`. */
export function readProjectTitleState(state: unknown): string | null {
  if (!state || typeof state !== "object") {
    return null;
  }
  const title = (state as { projectTitle?: unknown }).projectTitle;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

export function formatObjectDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const month = pick("month").replace(/\.$/, "");
  return `${pick("day")} ${month}. ${pick("year")}, ${pick("hour")}:${pick("minute")}`;
}

export function objectTags(item: PixelObjectDto): string[] {
  const typeLabel = PIXEL_OBJECT_TYPE_LABEL[item.objectType];
  const raw = (item as PixelObjectDto & { tags?: unknown }).tags;
  if (Array.isArray(raw)) {
    const tags = raw
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 2);
    if (tags.length > 0) {
      return [typeLabel, ...tags];
    }
  }
  return [typeLabel, OBJECT_STATUS_LABEL[item.status]];
}

export function emptyObjectsMessage(
  query: string,
  category: ObjectCategoryId,
  status: ObjectStatusFilter,
): string {
  const trimmed = query.trim();
  if (trimmed) {
    return `Ничего не найдено по запросу «${trimmed}».`;
  }
  if (category !== "all") {
    const label = OBJECT_CATEGORIES.find((item) => item.id === category)?.label ?? "категории";
    return `В категории «${label}» пока нет объектов.`;
  }
  if (status !== "all") {
    return "Нет объектов с таким статусом.";
  }
  return "Ничего не найдено.";
}
