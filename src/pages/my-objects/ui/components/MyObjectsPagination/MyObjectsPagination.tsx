import "./MyObjectsPagination.scss";
import "../../objectMenu.scss";

import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverItem } from "@/shared/ui/Popover";

import { OBJECT_PAGE_SIZES, pageWindow, type ObjectPageSize } from "../../../model/paginateObjects";

export type MyObjectsPaginationProps = {
  page: number;
  pageCount: number;
  pageSize: ObjectPageSize;
  canPrev: boolean;
  canNext: boolean;
  loadingMore: boolean;
  onPage: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onPageSize: (size: ObjectPageSize) => void;
};

export function MyObjectsPagination({
  page,
  pageCount,
  pageSize,
  canPrev,
  canNext,
  loadingMore,
  onPage,
  onPrev,
  onNext,
  onPageSize,
}: MyObjectsPaginationProps) {
  const [sizeOpen, setSizeOpen] = useState(false);
  const pages = pageWindow(page, pageCount);

  return (
    <footer className="my-objects-pagination">
      <div className="my-objects-pagination__pages">
        <button
          type="button"
          className="my-objects-pagination__page"
          aria-label="Предыдущая страница"
          disabled={!canPrev || loadingMore}
          onClick={onPrev}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        {pages.map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} className="my-objects-pagination__gap" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              className={`my-objects-pagination__page${entry === page ? " my-objects-pagination__page--active" : ""}`}
              aria-label={`Страница ${entry}`}
              aria-current={entry === page ? "page" : undefined}
              onClick={() => onPage(entry)}
            >
              {entry}
            </button>
          ),
        )}
        <button
          type="button"
          className="my-objects-pagination__page"
          aria-label="Следующая страница"
          disabled={!canNext || loadingMore}
          onClick={onNext}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>

      <div className="my-objects-pagination__size">
        <span>Показывать по:</span>
        <Popover
          open={sizeOpen}
          onOpenChange={setSizeOpen}
          placement="top"
          content={
            <div className="object-menu" role="menu" aria-label="Размер страницы">
              {OBJECT_PAGE_SIZES.map((size) => (
                <PopoverItem
                  key={size}
                  role="menuitemradio"
                  aria-checked={pageSize === size}
                  className={pageSize === size ? "object-menu__active" : undefined}
                  onClick={() => {
                    onPageSize(size);
                    setSizeOpen(false);
                  }}
                >
                  {size}
                  {pageSize === size ? <Check size={14} aria-hidden /> : null}
                </PopoverItem>
              ))}
            </div>
          }
        >
          <button type="button" className="my-objects-pagination__size-btn" aria-haspopup="menu">
            {pageSize}
            <ChevronDown size={14} aria-hidden />
          </button>
        </Popover>
      </div>
    </footer>
  );
}
