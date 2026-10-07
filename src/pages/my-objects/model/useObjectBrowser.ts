import { useEffect, useMemo, useState } from "react";

import type { PixelObjectDto } from "@/shared/api/pixelObjects";

import type { ObjectCategoryId, ObjectStatusFilter } from "./objectCategories";
import { filterSortObjects, type ObjectSortMode } from "./filterSortObjects";
import { paginate, type ObjectPageSize } from "./paginateObjects";

export function useObjectBrowser(items: readonly PixelObjectDto[], scopeKey: string | null) {
  const [query, setQueryState] = useState("");
  const [sortMode, setSortModeState] = useState<ObjectSortMode>("updated");
  const [status, setStatusState] = useState<ObjectStatusFilter>("all");
  const [category, setCategoryState] = useState<ObjectCategoryId>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<ObjectPageSize>(12);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setQueryState("");
    setSortModeState("updated");
    setStatusState("all");
    setCategoryState("all");
    setPage(1);
    setPageSizeState(12);
    setSelected(new Set());
  }, [scopeKey]);

  const visible = useMemo(
    () => filterSortObjects(items, query, sortMode, status, category),
    [items, query, sortMode, status, category],
  );
  const paged = paginate(visible, page, pageSize);

  useEffect(() => {
    const alive = new Set(items.map((item) => item.id));
    setSelected((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (alive.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  function setQuery(value: string): void {
    setQueryState(value);
    setPage(1);
  }

  function setSortMode(value: ObjectSortMode): void {
    setSortModeState(value);
    setPage(1);
  }

  function setStatus(value: ObjectStatusFilter): void {
    setStatusState(value);
    setPage(1);
  }

  function setCategory(value: ObjectCategoryId): void {
    setCategoryState(value);
    setPage(1);
  }

  function setPageSize(value: ObjectPageSize): void {
    setPageSizeState(value);
    setPage(1);
  }

  function toggleSelected(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function setPageSelection(ids: readonly string[], on: boolean): void {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }

  const selectedItems = useMemo(
    () => items.filter((item) => selected.has(item.id)),
    [items, selected],
  );

  const pageAllSelected =
    paged.items.length > 0 && paged.items.every((item) => selected.has(item.id));
  const pageSomeSelected = paged.items.some((item) => selected.has(item.id));

  return {
    query,
    setQuery,
    sortMode,
    setSortMode,
    status,
    setStatus,
    category,
    setCategory,
    page: paged.page,
    setPage,
    pageSize,
    setPageSize,
    pageCount: paged.pageCount,
    pageItems: paged.items,
    visibleCount: visible.length,
    selectedCount: selected.size,
    selectedItems,
    pageAllSelected,
    pageSomeSelected,
    toggleSelected,
    setPageSelection,
    isSelected: (id: string) => selected.has(id),
  };
}
