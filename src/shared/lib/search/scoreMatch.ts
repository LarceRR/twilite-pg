import { getSearchableText } from "./getSearchableText";
import type { SearchItem } from "./types";

/** Subsequence fuzzy: characters of query appear in order in haystack. */
export function fuzzyIncludes(haystack: string, needle: string): boolean {
  if (!needle) return true;
  let index = 0;

  for (const char of haystack) {
    if (char === needle[index]) index += 1;
    if (index === needle.length) return true;
  }

  return false;
}

export function charOverlapScore(haystack: string, needle: string): number {
  if (!needle) return 0;

  const bag = new Map<string, number>();
  for (const char of haystack) {
    bag.set(char, (bag.get(char) ?? 0) + 1);
  }

  let matched = 0;
  for (const char of needle) {
    const count = bag.get(char) ?? 0;
    if (count <= 0) continue;
    bag.set(char, count - 1);
    matched += 1;
  }

  return matched / needle.length;
}

export function scoreItem(item: SearchItem, query: string): number {
  const text = getSearchableText(item);
  if (!query) return 1;
  if (text === query) return 1;
  if (text.startsWith(query)) return 0.95;
  if (text.includes(query)) return 0.85;
  if (fuzzyIncludes(text, query)) return 0.55;
  return charOverlapScore(text, query) * 0.4;
}
