import type { ProjectDto } from "@/shared/api/projects";

export type ProjectSortMode = "updated" | "title";

export function filterSortProjects(
  items: readonly ProjectDto[],
  query: string,
  sortMode: ProjectSortMode,
): ProjectDto[] {
  const normalized = query.trim().toLocaleLowerCase("ru");
  const filtered = normalized
    ? items.filter((project) => project.title.toLocaleLowerCase("ru").includes(normalized))
    : [...items];

  return filtered.sort((a, b) => {
    if (sortMode === "title") {
      return a.title.localeCompare(b.title, "ru", { sensitivity: "base" });
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
