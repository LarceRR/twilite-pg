import { getSearchableText } from "./getSearchableText";
import { fuzzyIncludes, scoreItem } from "./scoreMatch";
import { tokenizeQuery } from "./normalizeQuery";
import type { MatchStrategy, SearchHit, SearchItem } from "./types";

const MIN_SCORE = 0.15;

export function matchByStrategy(
  items: SearchItem[],
  query: string,
  strategy: MatchStrategy,
): SearchHit[] {
  if (strategy === "all") {
    return items.map((item) => ({
      item,
      score: 1,
      strategy,
      matchedQuery: "",
    }));
  }

  return items
    .map((item) => toHit(item, query, strategy))
    .filter((hit): hit is SearchHit => hit !== null)
    .sort((a, b) => b.score - a.score);
}

function toHit(
  item: SearchItem,
  query: string,
  strategy: MatchStrategy,
): SearchHit | null {
  const text = getSearchableText(item);
  const score = resolveScore(text, item, query, strategy);
  if (score < MIN_SCORE) return null;

  return { item, score, strategy, matchedQuery: query };
}

function resolveScore(
  text: string,
  item: SearchItem,
  query: string,
  strategy: MatchStrategy,
): number {
  switch (strategy) {
    case "exact":
      return text.includes(query) ? scoreItem(item, query) : 0;
    case "fuzzy":
      return fuzzyIncludes(text, query) ? scoreItem(item, query) : 0;
    case "token":
      return scoreTokenMatch(text, query);
    case "partial":
    case "prefix":
      return text.includes(query) || fuzzyIncludes(text, query)
        ? scoreItem(item, query)
        : 0;
    case "char":
      return scoreItem(item, query);
    default:
      return 0;
  }
}

function scoreTokenMatch(text: string, query: string): number {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return 0;

  const matched = tokens.filter((token) => text.includes(token));
  if (matched.length === 0) return 0;

  return matched.length / tokens.length;
}
