import { describe, expect, it } from "vitest";

import type { ProjectDto } from "@/shared/api/projects";

import { filterSortProjects } from "./filterSortProjects";

function project(partial: Partial<ProjectDto> & Pick<ProjectDto, "id" | "title">): ProjectDto {
  return {
    description: "",
    ownerUserId: "u1",
    ownerDisplayName: "User",
    avatarUrl: null,
    objectCount: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("filterSortProjects", () => {
  const items = [
    project({ id: "a", title: "Forest Pack", updatedAt: "2025-10-01T00:00:00.000Z" }),
    project({ id: "b", title: "Tiny Dungeon", updatedAt: "2025-10-12T00:00:00.000Z" }),
    project({ id: "c", title: "City Night", updatedAt: "2025-09-01T00:00:00.000Z" }),
  ];

  it("filters by title case-insensitively", () => {
    expect(filterSortProjects(items, "dungeon", "updated").map((item) => item.id)).toEqual(["b"]);
  });

  it("sorts by updatedAt descending", () => {
    expect(filterSortProjects(items, "", "updated").map((item) => item.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("sorts by title ascending", () => {
    expect(filterSortProjects(items, "", "title").map((item) => item.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
});
