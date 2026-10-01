import type { SearchCategoryMeta, SearchHit, SearchItemType } from "./types";

export const SEARCH_CATEGORIES: SearchCategoryMeta[] = [
  { type: "project", label: "Проекты" },
  { type: "object", label: "Объекты" },
  { type: "user", label: "Пользователи" },
  { type: "tag", label: "Теги" },
];

export function groupHitsByType(
  hits: SearchHit[],
): Record<SearchItemType, SearchHit[]> {
  const groups: Record<SearchItemType, SearchHit[]> = {
    project: [],
    object: [],
    user: [],
    tag: [],
  };

  for (const hit of hits) {
    groups[hit.item.type].push(hit);
  }

  return groups;
}
