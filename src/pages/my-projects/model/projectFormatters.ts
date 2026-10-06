const EMPTY_HERO_IMAGES = [
  "/new-project/new-project-1.png",
  "/new-project/new-project-2.png",
  "/new-project/new-project-3.png",
  "/new-project/new-project-4.png",
  "/new-project/new-project-5.png",
  "/new-project/new-project-6.png",
] as const;

export function pickEmptyHero(random = Math.random): string {
  const index = Math.floor(random() * EMPTY_HERO_IMAGES.length);
  return EMPTY_HERO_IMAGES[index] ?? EMPTY_HERO_IMAGES[0];
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
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

export function formatProjectCount(n: number): string {
  return `${n} ${pluralRu(n, "проект", "проекта", "проектов")}`;
}

export function formatObjectCount(n: number): string {
  return `${n} ${pluralRu(n, "объект", "объекта", "объектов")}`;
}

export function formatUpdatedAt(iso: string): string {
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
  return `Обновлено ${formatted}`;
}
