export function buildSearchResultsClassName(isVisible: boolean): string {
  return [
    "search-results",
    isVisible ? "search-results--open" : "search-results--closed",
  ].join(" ");
}
