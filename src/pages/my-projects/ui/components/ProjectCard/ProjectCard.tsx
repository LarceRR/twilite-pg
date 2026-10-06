import "./ProjectCard.scss";

import { Box, Calendar, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import type { ProjectDto } from "@/shared/api/projects";
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
    navigate(objectsPath);
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
      <div className="project-card__cover" aria-hidden>
        {project.avatarUrl ? (
          <img src={project.avatarUrl} alt="" />
        ) : (
          <span>{project.title.slice(0, 2).toUpperCase()}</span>
        )}
      </div>

      <div className="project-card__body">
        <div className="project-card__top">
          <div className="project-card__heading">
            <h2>{project.title}</h2>
            {project.description?.trim() ? (
              <p className="project-card__description">{project.description.trim()}</p>
            ) : null}
          </div>
          <div
            className="project-card__menu-anchor"
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
                <MoreHorizontal size={18} aria-hidden />
              </button>
            </Popover>
          </div>
        </div>

        <div className="project-card__meta">
          <span>
            <Box size={14} aria-hidden />
            {formatObjectCount(project.objectCount)}
          </span>
          <span>
            <Calendar size={14} aria-hidden />
            {formatUpdatedAt(project.updatedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
