import "./MyProjectsPage.scss";

import { useState } from "react";

import {
  filterSortProjects,
  type ProjectSortMode,
} from "../model/filterSortProjects";
import { useMyProjects } from "../model/useMyProjects";
import { CreateProjectModal } from "./components/CreateProjectModal/CreateProjectModal";
import { MyProjectsEmptyState } from "./components/MyProjectsEmptyState/MyProjectsEmptyState";
import { MyProjectsHeader } from "./components/MyProjectsHeader/MyProjectsHeader";
import { MyProjectsToolbar } from "./components/MyProjectsToolbar/MyProjectsToolbar";
import { ProjectCard } from "./components/ProjectCard/ProjectCard";

export function MyProjectsPage() {
  const projects = useMyProjects();
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<ProjectSortMode>("updated");

  const isEmpty = !projects.loading && projects.items.length === 0;
  const visibleItems = filterSortProjects(projects.items, query, sortMode);

  return (
    <section className={`my-projects${isEmpty ? " my-projects--empty" : ""}`}>
      {!isEmpty ? (
        <MyProjectsHeader
          projectCount={projects.items.length}
          toolbar={
            <MyProjectsToolbar
              query={query}
              sortMode={sortMode}
              canCreate={projects.canCreate}
              onQueryChange={setQuery}
              onToggleSort={() =>
                setSortMode((prev) => (prev === "updated" ? "title" : "updated"))
              }
              onCreate={projects.openCreate}
            />
          }
        />
      ) : null}

      {projects.loading ? <p className="my-projects__status">Загрузка…</p> : null}

      {isEmpty ? (
        <MyProjectsEmptyState
          heroSrc={projects.emptyHeroSrc}
          canCreate={projects.canCreate}
          onCreate={projects.openCreate}
        />
      ) : null}

      {!isEmpty ? (
        <div className="my-projects__grid">
          {visibleItems.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              busy={projects.busyId === project.id}
              canCreateObject={projects.canCreateObject}
              canEdit={projects.canEdit}
              canDelete={projects.canDelete}
              onRename={(item) => void projects.rename(item)}
              onDelete={(item) => void projects.remove(item)}
              onAvatar={(item, file) => void projects.uploadAvatar(item, file)}
            />
          ))}
        </div>
      ) : null}

      {!isEmpty && !projects.loading && visibleItems.length === 0 ? (
        <p className="my-projects__status">Ничего не найдено по запросу «{query.trim()}».</p>
      ) : null}

      <CreateProjectModal
        open={projects.createOpen}
        title={projects.createTitle}
        description={projects.createDescription}
        creating={projects.creating}
        onTitleChange={projects.setCreateTitle}
        onDescriptionChange={projects.setCreateDescription}
        onClose={projects.closeCreate}
        onSubmit={() => void projects.create()}
      />
    </section>
  );
}
