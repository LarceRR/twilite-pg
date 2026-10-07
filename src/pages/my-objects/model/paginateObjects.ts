export const OBJECT_PAGE_SIZES = [12, 24, 48] as const;
export type ObjectPageSize = (typeof OBJECT_PAGE_SIZES)[number];

export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): { page: number; pageCount: number; items: T[] } {
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * size;
  return {
    page: safePage,
    pageCount,
    items: items.slice(start, start + size),
  };
}

export function pageWindow(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const window: Array<number | "gap"> = [];
  for (const value of sorted) {
    const previous = window[window.length - 1];
    if (typeof previous === "number" && value - previous > 1) {
      window.push("gap");
    }
    window.push(value);
  }
  return window;
}
