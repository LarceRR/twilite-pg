import "./ProjectCardMenu.scss";

import { Box, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";

import type { ProjectDto } from "@/shared/api/projects";
import { PopoverItem } from "@/shared/ui/Popover";

export type ProjectCardMenuProps = {
  project: ProjectDto;
  busy: boolean;
  canCreateObject: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onNewObject: () => void;
  onOpenObjects: () => void;
  onRename: () => void;
  onAvatar: (file: File | undefined) => void;
  onDelete: () => void;
};

export function ProjectCardMenu({
  project,
  busy,
  canCreateObject,
  canEdit,
  canDelete,
  onNewObject,
  onOpenObjects,
  onRename,
  onAvatar,
  onDelete,
}: ProjectCardMenuProps) {
  return (
    <div className="project-card-menu" role="menu" aria-label={`Действия: ${project.title}`}>
      {canCreateObject ? (
        <PopoverItem role="menuitem" onClick={onNewObject}>
          <Plus size={16} aria-hidden />
          Новый объект
        </PopoverItem>
      ) : null}
      <PopoverItem role="menuitem" onClick={onOpenObjects}>
        <Box size={16} aria-hidden />
        Объекты
      </PopoverItem>
      {canEdit ? (
        <>
          <PopoverItem role="menuitem" onClick={onRename} disabled={busy}>
            <Pencil size={16} aria-hidden />
            Переименовать
          </PopoverItem>
          <label className="project-card-menu__file" role="menuitem">
            <ImagePlus size={16} aria-hidden />
            Аватар
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => onAvatar(event.target.files?.[0])}
            />
          </label>
        </>
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
