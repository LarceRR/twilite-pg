import "./ObjectCardMenu.scss";

import { Pencil, Trash2 } from "lucide-react";

import { PopoverItem } from "@/shared/ui/Popover";

export type ObjectCardMenuProps = {
  title: string;
  busy: boolean;
  canOpen: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onDelete: () => void;
};

export function ObjectCardMenu({ title, busy, canOpen, canDelete, onOpen, onDelete }: ObjectCardMenuProps) {
  return (
    <div className="object-card-menu" role="menu" aria-label={`Действия: ${title}`}>
      {canOpen ? (
        <PopoverItem role="menuitem" onClick={onOpen} disabled={busy}>
          <Pencil size={16} aria-hidden />
          Открыть в редакторе
        </PopoverItem>
      ) : null}
      {canDelete ? (
        <PopoverItem role="menuitem" onClick={onDelete} disabled={busy}>
          <Trash2 size={16} aria-hidden />
          Удалить
        </PopoverItem>
      ) : null}
    </div>
  );
}
