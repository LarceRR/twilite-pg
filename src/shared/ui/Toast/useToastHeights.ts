import { useLayoutEffect, useState, type RefObject } from "react";

import type { ToastHeightEntry } from "./toastTypes";

export function useToastHeights(
  orderedIds: readonly string[],
  listRef: RefObject<HTMLElement | null>,
): ToastHeightEntry[] {
  const [heights, setHeights] = useState<ToastHeightEntry[]>([]);

  useLayoutEffect(() => {
    const root = listRef.current;
    if (!root) {
      setHeights([]);
      return;
    }

    const measure = () => {
      const next: ToastHeightEntry[] = [];
      for (const id of orderedIds) {
        const node = root.querySelector<HTMLElement>(`[data-toast-id="${id}"]`);
        if (node) {
          next.push({ id, height: node.offsetHeight });
        }
      }
      setHeights((prev) => {
        if (
          prev.length === next.length &&
          prev.every((entry, index) => entry.id === next[index]?.id && entry.height === next[index]?.height)
        ) {
          return prev;
        }
        return next;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    for (const id of orderedIds) {
      const node = root.querySelector<HTMLElement>(`[data-toast-id="${id}"]`);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [listRef, orderedIds]);

  return heights;
}
