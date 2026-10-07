import "./ProjectCard.scss";

import { Box, Calendar, Folder, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { mediaCrossOrigin, mediaSrc } from "@/shared/api/mediaSrc";
import type { ProjectDto } from "@/shared/api/projects";
import { usePixelObjectEditStore } from "@/shared/store/pixelObjectEdit";
import { Popover } from "@/shared/ui/Popover";

import { formatObjectCount, formatUpdatedAt } from "../../../model/projectFormatters";
import { ProjectCardMenu } from "./ProjectCardMenu";

export type ProjectCardProps = {
  project: ProjectDto;
  busy: boolean;
  canCreateObject: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onRename: (project: ProjectDto) => void;
  onDelete: (project: ProjectDto) => void;
  onAvatar: (project: ProjectDto, file: File | undefined) => void;
};

export function ProjectCard({
  project,
  busy,
  canCreateObject,
  canEdit,
  canDelete,
  onRename,
  onDelete,
  onAvatar,
}: ProjectCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const objectsPath = `/my-objects?projectId=${project.id}`;

  function openProject(): void {
    navigate(objectsPath, { state: { projectTitle: project.title } });
  }

  return (
    <article
      className="project-card"
      role="link"
      tabIndex={0}
      onClick={openProject}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProject();
        }
      }}
    >
      <div className="project-card__preview">
        <div
          className="project-card__menu"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Popover
            open={menuOpen}
            onOpenChange={setMenuOpen}
            placement="bottom"
            disabled={busy}
            content={
              <ProjectCardMenu
                project={project}
                busy={busy}
                canCreateObject={canCreateObject}
                canEdit={canEdit}
                canDelete={canDelete}
                onNewObject={() => {
                  setMenuOpen(false);
                  usePixelObjectEditStore.getState().clearEditingObject();
                  navigate(`/new-project?projectId=${project.id}`);
                }}
                onOpenObjects={() => {
                  setMenuOpen(false);
                  openProject();
                }}
                onRename={() => {
                  setMenuOpen(false);
                  onRename(project);
                }}
                onAvatar={(file) => {
                  setMenuOpen(false);
                  onAvatar(project, file);
                }}
                onDelete={() => {
                  setMenuOpen(false);
                  onDelete(project);
                }}
              />
            }
          >
            <button
              type="button"
              className="project-card__menu-trigger"
              aria-label={`Действия: ${project.title}`}
              aria-haspopup="menu"
              disabled={busy}
            >
              <MoreHorizontal size={16} aria-hidden />
            </button>
          </Popover>
        </div>
        {project.avatarUrl ? (
          <img
            src={mediaSrc(project.avatarUrl)}
            crossOrigin={mediaCrossOrigin(project.avatarUrl)}
            alt=""
          />
        ) : (
          <span className="project-card__mark">{project.title.slice(0, 2).toUpperCase()}</span>
        )}
      </div>

      <div className="project-card__body">
        <h2 className="project-card__title">
          <Folder size={14} aria-hidden />
          <span>{project.title}</span>
        </h2>
        <p className="project-card__tags">
          <Box size={13} aria-hidden />
          <span className="project-card__tag">{formatObjectCount(project.objectCount)}</span>
          {project.isReassignmentInbox ? (
            <span className="project-card__tag">Сюда попадают переназначенные объекты</span>
          ) : null}
          {project.description?.trim() ? (
            <span className="project-card__tag">{project.description.trim()}</span>
          ) : null}
        </p>
        <div className="project-card__footer">
          <span className="project-card__date">
            <Calendar size={13} aria-hidden />
            {formatUpdatedAt(project.updatedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
