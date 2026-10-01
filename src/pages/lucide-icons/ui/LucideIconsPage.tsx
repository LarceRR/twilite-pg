import { icons } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./LucideIconsPage.scss";

const PAGE_SIZE = 80;
const ALL_ICON_NAMES = Object.keys(icons).sort((a, b) => a.localeCompare(b));

export default function LucideIconsPage() {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filteredNames = useMemo(() => {
    const normalized = query.trim().toLowerCase().replace(/[\s-_]/g, "");
    if (!normalized) return ALL_ICON_NAMES;

    return ALL_ICON_NAMES.filter((name) => name.toLowerCase().includes(normalized));
  }, [query]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query]);

  const visibleNames = filteredNames.slice(0, visibleCount);
  const hasMore = visibleCount < filteredNames.length;

  const loadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredNames.length));
  }, [filteredNames.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { root: node.closest(".layout__main"), rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, visibleNames.length]);

  const handleSelect = async (name: string) => {
    await navigator.clipboard.writeText(name);
    setCopiedName(name);
  };

  return (
    <section className="lucide-icons">
      <header className="lucide-icons__header">
        <div className="lucide-icons__title">
          <h1>Lucide Icons</h1>
          <span>
            {visibleNames.length} / {filteredNames.length}
          </span>
        </div>
        <input
          className="lucide-icons__search"
          type="search"
          placeholder="Поиск иконки..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </header>

      {filteredNames.length === 0 ? (
        <p className="lucide-icons__empty">Ничего не найдено</p>
      ) : (
        <div className="lucide-icons__grid">
          {visibleNames.map((name) => {
            const Icon = icons[name as keyof typeof icons];

            return (
              <button
                key={name}
                type="button"
                className={`lucide-icons__item${copiedName === name ? " lucide-icons__item--copied" : ""}`}
                onClick={() => handleSelect(name)}
              >
                <Icon size={24} />
                <span>{copiedName === name ? "Copied" : name}</span>
              </button>
            );
          })}
        </div>
      )}

      {hasMore ? <div ref={sentinelRef} className="lucide-icons__sentinel" /> : null}
    </section>
  );
}
