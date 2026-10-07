import { useCallback, useEffect, useState } from "react";

import type { ListPixelObjectsQuery, PixelObjectDto, PixelObjectListPage } from "@/shared/api/pixelObjects";
import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import { toast } from "@/shared/ui/Toast";

type UseCursorListOptions = {
  loadPage: (query?: ListPixelObjectsQuery) => Promise<PixelObjectListPage>;
  limit?: number;
  enabled?: boolean;
};

export function useCursorList({ loadPage, limit = 30, enabled = true }: UseCursorListOptions) {
  const [items, setItems] = useState<PixelObjectDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    try {
      const page = await loadPage({ limit });
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось загрузить список."));
    } finally {
      setLoading(false);
    }
  }, [enabled, limit, loadPage]);

  const loadMore = useCallback(async (): Promise<number> => {
    if (!enabled || !nextCursor || loadingMore) {
      return 0;
    }
    setLoadingMore(true);
    try {
      const page = await loadPage({ cursor: nextCursor, limit });
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
      return page.items.length;
    } catch (caught) {
      toast.error(mapApiErrorMessage(caught, "Не удалось загрузить следующую страницу."));
      return 0;
    } finally {
      setLoadingMore(false);
    }
  }, [enabled, limit, loadPage, loadingMore, nextCursor]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    nextCursor,
    loading,
    loadingMore,
    reload,
    loadMore,
    removeItem,
  };
}
