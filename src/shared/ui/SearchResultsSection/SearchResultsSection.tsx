import type { SearchHit } from "@/shared/lib/search";
import SearchResultItem from "@/shared/ui/SearchResultItem/SearchResultItem";
import "./SearchResultsSection.scss";

export interface SearchResultsSectionProps {
  title: string;
  hits: SearchHit[];
  onSelect?: (hit: SearchHit) => void;
}

export default function SearchResultsSection({
  title,
  hits,
  onSelect,
}: SearchResultsSectionProps) {
  if (hits.length === 0) return null;

  return (
    <section className="search-results-section">
      <h3 className="search-results-section__title">{title}</h3>
      <div className="search-results-section__list">
        {hits.map((hit) => (
          <SearchResultItem key={hit.item.id} hit={hit} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}
