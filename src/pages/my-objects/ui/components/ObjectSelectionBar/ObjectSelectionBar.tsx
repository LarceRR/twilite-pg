import "./ObjectSelectionBar.scss";

import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

export type ObjectSelectionBarProps = {
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  busy: boolean;
  onTogglePage: (selected: boolean) => void;
  onDelete: () => void;
};

export function ObjectSelectionBar({
  selectedCount,
  allSelected,
  someSelected,
  busy,
  onTogglePage,
  onDelete,
}: ObjectSelectionBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [allSelected, someSelected]);

  return (
    <div className="object-selection-bar">
      <label className="object-selection-bar__select">
        <span className="my-objects-check-wrap">
          <input
            ref={inputRef}
            type="checkbox"
            className="my-objects-check"
            checked={allSelected}
            disabled={busy}
            aria-label="Выбрать объекты на странице"
            onChange={() => onTogglePage(!allSelected)}
          />
          <span className="my-objects-check__box" aria-hidden />
        </span>
        Выбрано: {selectedCount}
      </label>
      <button
        type="button"
        className="object-selection-bar__action object-selection-bar__delete"
        disabled={busy || selectedCount === 0}
        onClick={onDelete}
      >
        <Trash2 size={15} aria-hidden />
        {busy ? "Удаление…" : "Удалить"}
      </button>
    </div>
  );
}
