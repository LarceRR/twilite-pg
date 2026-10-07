import { describe, expect, it } from "vitest";

import {
  formatObjectCount,
  formatProjectCount,
  formatUpdatedAt,
  pickEmptyHero,
  pluralRu,
} from "./projectFormatters";

describe("pluralRu", () => {
  it("picks one / few / many forms", () => {
    expect(pluralRu(1, "проект", "проекта", "проектов")).toBe("проект");
    expect(pluralRu(2, "проект", "проекта", "проектов")).toBe("проекта");
    expect(pluralRu(5, "проект", "проекта", "проектов")).toBe("проектов");
    expect(pluralRu(11, "проект", "проекта", "проектов")).toBe("проектов");
    expect(pluralRu(21, "проект", "проекта", "проектов")).toBe("проект");
    expect(pluralRu(22, "проект", "проекта", "проектов")).toBe("проекта");
  });
});

describe("format counts", () => {
  it("formats project and object counts", () => {
    expect(formatProjectCount(1)).toBe("1 проект");
    expect(formatProjectCount(6)).toBe("6 проектов");
    expect(formatObjectCount(24)).toBe("24 объекта");
    expect(formatObjectCount(1)).toBe("1 объект");
  });
});

describe("formatUpdatedAt", () => {
  it("prefixes a localized short date", () => {
    expect(formatUpdatedAt("2025-10-12T12:00:00.000Z")).toMatch(/^Обновлено /);
  });
});

describe("pickEmptyHero", () => {
  it("returns a hero path from the pool", () => {
    expect(pickEmptyHero(() => 0)).toBe("/new-project/new-project-1.png");
    expect(pickEmptyHero(() => 0.99)).toMatch(/^\/new-project\/new-project-\d\.png$/);
  });
});
