export type SearchItemType = "project" | "object" | "user" | "tag";

export type MatchStrategy =
  | "all"
  | "exact"
  | "fuzzy"
  | "token"
  | "partial"
  | "prefix"
  | "char";

export interface SearchItem {
  id: string;
  type: SearchItemType;
  title: string;
  subtitle?: string;
  tags?: string[];
  href?: string;
}

export interface SearchHit {
  item: SearchItem;
  score: number;
  strategy: MatchStrategy;
  matchedQuery: string;
}

export interface SearchOutcome {
  hits: SearchHit[];
  strategy: MatchStrategy;
  activeQuery: string;
  isRelaxed: boolean;
}

export interface SearchCategoryMeta {
  type: SearchItemType;
  label: string;
}
