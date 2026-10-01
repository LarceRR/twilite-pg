import { useCallback, useEffect, useState } from "react";

import type { ListPixelObjectsQuery, PixelObjectDto, PixelObjectListPage } from "@/shared/api/pixelObjects";
import { mapApiErrorMessage } from "@/shared/api/mapApiError";

type UseCursorListOptions = {
  loadPage: (query?: ListPixelObjectsQuery) => Promise<PixelObjectListPage>;
  limit?: number;
  enabled?: boolean;
};

export function useCursorList({ loadPage, limit = 30, enabled = true }: UseCursorListOptions) {
  const [items, setItems] = useState<PixelObjectDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const page = await loadPage({ limit });
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (caught) {
      setError(mapApiErrorMessage(caught, "Не удалось загрузить список."));
    } finally {
      setLoading(false);
    }
  }, [enabled, limit, loadPage]);

  const loadMore = useCallback(async () => {
    if (!enabled || !nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    try {
      const page = await loadPage({ cursor: nextCursor, limit });
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (caught) {
      setError(mapApiErrorMessage(caught, "Не удалось загрузить следующую страницу."));
    } finally {
      setLoadingMore(false);
    }
  }, [enabled, limit, loadPage, loadingMore, nextCursor]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    items,
    nextCursor,
    error,
    loading,
    loadingMore,
    reload,
    loadMore,
    setError,
  };
}
