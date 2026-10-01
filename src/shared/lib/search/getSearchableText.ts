import type { SearchItem } from "./types";

export function getSearchableText(item: SearchItem): string {
  const parts = [item.title, item.subtitle, ...(item.tags ?? [])];
  return parts.filter(Boolean).join(" ").toLowerCase();
}
