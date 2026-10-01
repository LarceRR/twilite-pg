import { SEARCH_MOCK_ITEMS } from "@/shared/const/searchMocks";
import {
  groupHitsByType,
  searchItems,
  type SearchItem,
  type SearchOutcome,
} from "@/shared/lib/search";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

interface UseSearchOptions {
  items?: SearchItem[];
  query: string;
  delayMs?: number;
}

export function useSearch({
  items = SEARCH_MOCK_ITEMS,
  query,
  delayMs = 120,
}: UseSearchOptions) {
  const debouncedQuery = useDebouncedValue(query, delayMs);
  const outcome: SearchOutcome = searchItems(items, debouncedQuery);
  const grouped = groupHitsByType(outcome.hits);

  return {
    ...outcome,
    grouped,
    debouncedQuery,
    total: outcome.hits.length,
  };
}
