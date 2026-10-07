import "./MyProjectsToolbar.scss";

import { ArrowUpDown, Plus, Search, SlidersHorizontal } from "lucide-react";

import Input from "@/shared/ui/Input/Input";

import type { ProjectSortMode } from "../../../model/filterSortProjects";

export type MyProjectsToolbarProps = {
  query: string;
  sortMode: ProjectSortMode;
  canCreate: boolean;
  onQueryChange: (value: string) => void;
  onToggleSort: () => void;
  onCreate: () => void;
};

export function MyProjectsToolbar({
  query,
  sortMode,
  canCreate,
  onQueryChange,
  onToggleSort,
  onCreate,
}: MyProjectsToolbarProps) {
  return (
    <div className="my-projects-toolbar">
      <Input
        className="my-projects-toolbar__search"
        variant="field"
        icon={<Search size={16} aria-hidden />}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Поиск проектов..."
        aria-label="Поиск проектов"
      />
      <button type="button" className="my-projects-toolbar__btn" disabled title="Скоро">
        <SlidersHorizontal size={16} aria-hidden />
        Фильтры
      </button>
      <button
        type="button"
        className="my-projects-toolbar__btn"
        onClick={onToggleSort}
        title={sortMode === "updated" ? "Сейчас: по обновлению" : "Сейчас: по названию"}
      >
        <ArrowUpDown size={16} aria-hidden />
        Сортировка
      </button>
      {canCreate ? (
        <button type="button" className="my-projects__primary my-projects-toolbar__create" onClick={onCreate}>
          <Plus size={18} aria-hidden />
          Создать проект
        </button>
      ) : null}
    </div>
  );
}
