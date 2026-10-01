import { SEARCH_CATEGORIES, getStrategyHint, type SearchHit } from "@/shared/lib/search";
import { useSearch } from "@/shared/hooks/useSearch";
import SearchResultsSection from "@/shared/ui/SearchResultsSection/SearchResultsSection";
import type { CSSProperties } from "react";
import "./SearchResults.scss";
import { buildSearchResultsClassName } from "./buildSearchResultsClassName";

export interface SearchResultsProps {
  query: string;
  isVisible: boolean;
  onSelect?: (hit: SearchHit) => void;
}

export default function SearchResults({
  query,
  isVisible,
  onSelect,
}: SearchResultsProps) {
  const { grouped, strategy, isRelaxed, activeQuery, total } = useSearch({
    query,
  });

  const hint = getStrategyHint(strategy, isRelaxed, activeQuery);
  const sections = SEARCH_CATEGORIES.filter(
    (category) => grouped[category.type].length > 0,
  );
  const bodyStyle = {
    "--search-cols": Math.min(sections.length || 1, 4),
  } as CSSProperties;

  return (
    <div
      className={buildSearchResultsClassName(isVisible)}
      role="listbox"
      aria-label="Результаты поиска"
      onMouseDown={(event) => event.preventDefault()}
    >
      <header className="search-results__header">
        <span className="search-results__hint">{hint}</span>
        <span className="search-results__count">{total}</span>
      </header>

      <div className="search-results__body" style={bodyStyle}>
        {sections.map((category) => (
          <SearchResultsSection
            key={category.type}
            title={category.label}
            hits={grouped[category.type]}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
