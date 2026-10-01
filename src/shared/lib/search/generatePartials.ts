import { tokenizeQuery } from "./normalizeQuery";

/**
 * Empathy-style partial query generation:
 * 1) full query
 * 2) token drop combinations (longest first)
 * 3) progressive prefix shortening of remaining tokens
 */
export function generatePartials(query: string): string[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];

  const seen = new Set<string>();
  const partials: string[] = [];

  const push = (value: string) => {
    const next = value.trim();
    if (!next || seen.has(next)) return;
    seen.add(next);
    partials.push(next);
  };

  push(tokens.join(" "));
  pushTokenDrops(tokens, push);
  pushPrefixShortening(tokens, push);

  return partials;
}

function pushTokenDrops(
  tokens: string[],
  push: (value: string) => void,
): void {
  if (tokens.length < 2) return;

  const byLength = [...tokens].sort((a, b) => b.length - a.length);

  for (const drop of byLength) {
    push(tokens.filter((token) => token !== drop).join(" "));
  }

  for (const token of byLength) {
    push(token);
  }
}

function pushPrefixShortening(
  tokens: string[],
  push: (value: string) => void,
): void {
  const longest = [...tokens].sort((a, b) => b.length - a.length)[0];
  if (!longest || longest.length < 3) return;

  for (let size = longest.length - 1; size >= 2; size -= 1) {
    push(longest.slice(0, size));
  }
}
