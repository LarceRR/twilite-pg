import "./MyObjectsToolbar.scss";
import "../../objectMenu.scss";

import { ArrowUpDown, Check, ChevronDown, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import Input from "@/shared/ui/Input/Input";
import { Popover, PopoverItem } from "@/shared/ui/Popover";

import type { ObjectStatusFilter } from "../../../model/objectCategories";
import type { ObjectSortMode } from "../../../model/filterSortObjects";

const STATUS_OPTIONS: { id: ObjectStatusFilter; label: string }[] = [
  { id: "all", label: "Все статусы" },
  { id: "pending", label: "На модерации" },
  { id: "published", label: "Опубликован" },
  { id: "rejected", label: "Отклонён" },
];

const SORT_OPTIONS: { id: ObjectSortMode; label: string }[] = [
  { id: "updated", label: "Сначала новые" },
  { id: "title", label: "По названию" },
];

export type MyObjectsToolbarProps = {
  query: string;
  sortMode: ObjectSortMode;
  status: ObjectStatusFilter;
  canCreate: boolean;
  onQueryChange: (value: string) => void;
  onSortMode: (value: ObjectSortMode) => void;
  onStatus: (value: ObjectStatusFilter) => void;
  onCreate: () => void;
};

export function MyObjectsToolbar({
  query,
  sortMode,
  status,
  canCreate,
  onQueryChange,
  onSortMode,
  onStatus,
  onCreate,
}: MyObjectsToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div className="my-objects-toolbar">
      <Input
        className="my-objects-toolbar__search"
        variant="field"
        icon={<Search size={16} aria-hidden />}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Поиск по объектам..."
        aria-label="Поиск по объектам"
      />
      <Popover
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        placement="bottom"
        content={
          <div className="object-menu" role="menu" aria-label="Фильтры">
            {STATUS_OPTIONS.map((option) => (
              <PopoverItem
                key={option.id}
                role="menuitemradio"
                aria-checked={status === option.id}
                className={status === option.id ? "object-menu__active" : undefined}
                onClick={() => {
                  onStatus(option.id);
                  setFiltersOpen(false);
                }}
              >
                {option.label}
                {status === option.id ? <Check size={14} aria-hidden /> : null}
              </PopoverItem>
            ))}
          </div>
        }
      >
        <button
          type="button"
          className={`my-objects-toolbar__btn${status !== "all" ? " my-objects-toolbar__btn--active" : ""}`}
          aria-haspopup="menu"
        >
          <SlidersHorizontal size={16} aria-hidden />
          Фильтры
          <ChevronDown size={14} aria-hidden />
        </button>
      </Popover>
      <Popover
        open={sortOpen}
        onOpenChange={setSortOpen}
        placement="bottom"
        content={
          <div className="object-menu" role="menu" aria-label="Сортировка">
            {SORT_OPTIONS.map((option) => (
              <PopoverItem
                key={option.id}
                role="menuitemradio"
                aria-checked={sortMode === option.id}
                className={sortMode === option.id ? "object-menu__active" : undefined}
                onClick={() => {
                  onSortMode(option.id);
                  setSortOpen(false);
                }}
              >
                {option.label}
                {sortMode === option.id ? <Check size={14} aria-hidden /> : null}
              </PopoverItem>
            ))}
          </div>
        }
      >
        <button type="button" className="my-objects-toolbar__btn" aria-haspopup="menu">
          <ArrowUpDown size={16} aria-hidden />
          Сортировка
          <ChevronDown size={14} aria-hidden />
        </button>
      </Popover>
      {canCreate ? (
        <button type="button" className="my-objects__primary my-objects-toolbar__create" onClick={onCreate}>
          <Plus size={18} aria-hidden />
          Создать объект
        </button>
      ) : null}
    </div>
  );
}
