import type { MatchStrategy } from "@/shared/lib/search/types";

const STRATEGY_HINTS: Record<MatchStrategy, string> = {
  all: "Все результаты",
  exact: "Точные совпадения",
  fuzzy: "Похожие совпадения",
  token: "Совпадения по словам",
  partial: "Показаны частичные совпадения",
  prefix: "Показаны совпадения по части запроса",
  char: "Ближайшие совпадения по символам",
};

export function getStrategyHint(
  strategy: MatchStrategy,
  isRelaxed: boolean,
  activeQuery: string,
): string {
  const base = STRATEGY_HINTS[strategy];
  if (!isRelaxed || !activeQuery) return base;
  return `${base}: «${activeQuery}»`;
}
