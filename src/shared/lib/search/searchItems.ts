import { generatePartials } from "./generatePartials";
import { matchByStrategy } from "./matchByStrategy";
import { normalizeQuery } from "./normalizeQuery";
import { scoreItem } from "./scoreMatch";
import type { MatchStrategy, SearchHit, SearchItem, SearchOutcome } from "./types";

const CASCADE: MatchStrategy[] = [
  "exact",
  "fuzzy",
  "token",
  "partial",
  "prefix",
  "char",
];

/**
 * Never-empty search with progressive query relaxation.
 * Empty query → all items. Otherwise cascade strategies and partials.
 */
export function searchItems(
  items: SearchItem[],
  rawQuery: string,
): SearchOutcome {
  const query = normalizeQuery(rawQuery);

  if (!query) {
    return {
      hits: matchByStrategy(items, "", "all"),
      strategy: "all",
      activeQuery: "",
      isRelaxed: false,
    };
  }

  for (const strategy of CASCADE) {
    if (strategy === "partial" || strategy === "prefix") {
      const relaxed = tryPartials(items, query, strategy);
      if (relaxed) return relaxed;
      continue;
    }

    const hits = matchByStrategy(items, query, strategy);
    if (hits.length > 0) {
      return {
        hits,
        strategy,
        activeQuery: query,
        isRelaxed: strategy !== "exact",
      };
    }
  }

  return {
    hits: rankAllByOverlap(items, query),
    strategy: "char",
    activeQuery: query,
    isRelaxed: true,
  };
}

function tryPartials(
  items: SearchItem[],
  query: string,
  strategy: MatchStrategy,
): SearchOutcome | null {
  const partials = generatePartials(query).filter((part) => part !== query);

  for (const partial of partials) {
    const hits = matchByStrategy(items, partial, strategy);
    if (hits.length === 0) continue;

    return {
      hits,
      strategy,
      activeQuery: partial,
      isRelaxed: true,
    };
  }

  return null;
}

function rankAllByOverlap(items: SearchItem[], query: string): SearchHit[] {
  return items
    .map((item) => ({
      item,
      score: Math.max(scoreItem(item, query), 0.01),
      strategy: "char" as const,
      matchedQuery: query,
    }))
    .sort((a, b) => b.score - a.score);
}
