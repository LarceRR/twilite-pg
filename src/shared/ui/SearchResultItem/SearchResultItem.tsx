import type { SearchHit } from "@/shared/lib/search";
import { getSearchTypeIcon } from "./getSearchTypeIcon";
import "./SearchResultItem.scss";

export interface SearchResultItemProps {
  hit: SearchHit;
  onSelect?: (hit: SearchHit) => void;
}

export default function SearchResultItem({
  hit,
  onSelect,
}: SearchResultItemProps) {
  const { item } = hit;

  return (
    <button
      type="button"
      className="search-result-item"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect?.(hit)}
    >
      <span className="search-result-item__icon" aria-hidden>
        {getSearchTypeIcon(item.type)}
      </span>
      <span className="search-result-item__body">
        <span className="search-result-item__title">{item.title}</span>
        {item.subtitle ? (
          <span className="search-result-item__subtitle">{item.subtitle}</span>
        ) : null}
      </span>
    </button>
  );
}
