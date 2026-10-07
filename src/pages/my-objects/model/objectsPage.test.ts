import { describe, expect, it } from "vitest";

import type { PixelObjectDto } from "@/shared/api/pixelObjects";

import { filterSortObjects } from "./filterSortObjects";
import {
  emptyObjectsMessage,
  formatObjectCount,
  formatObjectDate,
  objectTags,
  readProjectTitleState,
  resolveObjectsTitle,
} from "./objectFormatters";
import { canDeleteObject, removalConfirm, removalSuccess } from "./objectRules";
import { pageWindow, paginate } from "./paginateObjects";

function object(
  partial: Partial<PixelObjectDto> & Pick<PixelObjectDto, "id" | "title">,
  extra?: Record<string, unknown>,
): PixelObjectDto {
  return {
    projectId: "p1",
    authorDisplayName: "User",
    authorUserId: "u1",
    objectType: "Good",
    status: "published",
    rejectionComment: null,
    revision: 1,
    manifest: {
      format: "twilite.pixelobject/v1",
      canvas: { width: 8, height: 8 },
      sheet: {
        mediaId: "m1",
        frameWidth: 8,
        frameHeight: 8,
        columns: 1,
        rows: 1,
        frameCount: 1,
      },
      animations: [{ id: "default", loop: true, frames: [{ frame: 0, durationMs: 100 }] }],
      staticPreviewFrame: 0,
    },
    sheetUrl: "https://example.test/sheet.png",
    createdAt: "2025-10-01T00:00:00.000Z",
    updatedAt: "2025-10-01T00:00:00.000Z",
    reviewedAt: null,
    ...partial,
    ...extra,
  } as PixelObjectDto;
}

describe("resolveObjectsTitle", () => {
  it("uses the project name when the page is opened from a project", () => {
    expect(resolveObjectsTitle("project-1", "Лесная деревня")).toBe("Лесная деревня");
  });

  it("keeps the library title without a project", () => {
    expect(resolveObjectsTitle(null, "Лесная деревня")).toBe("Мои объекты");
    expect(resolveObjectsTitle("project-1", "  ")).toBe("Мои объекты");
    expect(resolveObjectsTitle(null, null)).toBe("Мои объекты");
  });
});

describe("readProjectTitleState", () => {
  it("reads a non-empty title from navigation state", () => {
    expect(readProjectTitleState({ projectTitle: "  Таверна " })).toBe("Таверна");
    expect(readProjectTitleState(null)).toBeNull();
    expect(readProjectTitleState({ projectTitle: "" })).toBeNull();
  });
});

describe("formatObjectCount", () => {
  it("pluralizes objects", () => {
    expect(formatObjectCount(1)).toBe("1 объект");
    expect(formatObjectCount(24)).toBe("24 объекта");
    expect(formatObjectCount(11)).toBe("11 объектов");
  });
});

describe("formatObjectDate", () => {
  it("formats a short russian date", () => {
    expect(formatObjectDate("2025-10-26T11:32:00.000Z")).toMatch(/окт\. 2025, \d{2}:\d{2}$/);
    expect(formatObjectDate("nope")).toBe("");
  });
});

describe("filterSortObjects", () => {
  const items = [
    object({ id: "a", title: "Дуб древний", updatedAt: "2025-10-25T00:00:00.000Z", status: "published" }),
    object({ id: "b", title: "Маг-волшебник", updatedAt: "2025-10-26T00:00:00.000Z", status: "pending" }),
    object(
      { id: "c", title: "Таверна", updatedAt: "2025-10-24T00:00:00.000Z", status: "published" },
      { category: "buildings" },
    ),
  ];

  it("filters by title and status", () => {
    expect(filterSortObjects(items, "маг", "updated", "all", "all").map((item) => item.id)).toEqual(["b"]);
    expect(filterSortObjects(items, "", "updated", "pending", "all").map((item) => item.id)).toEqual(["b"]);
  });

  it("sorts by updated date and by title", () => {
    expect(filterSortObjects(items, "", "updated", "all", "all").map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(filterSortObjects(items, "", "title", "all", "all").map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("filters by category and leaves uncategorized objects in all", () => {
    expect(filterSortObjects(items, "", "updated", "all", "buildings").map((item) => item.id)).toEqual(["c"]);
    expect(filterSortObjects(items, "", "updated", "all", "characters")).toEqual([]);
  });
});

describe("objectTags", () => {
  it("prefers tags and falls back to status", () => {
    const tagged = object({ id: "a", title: "Дуб" }, { tags: ["Природа", "Лес"] });
    expect(objectTags(tagged)).toEqual(["Хороший момент", "Природа", "Лес"]);
    expect(objectTags(object({ id: "b", title: "Маг", status: "pending" }))).toEqual([
      "Хороший момент",
      "На модерации",
    ]);
  });
});

describe("emptyObjectsMessage", () => {
  it("explains the active filter", () => {
    expect(emptyObjectsMessage("дуб", "all", "all")).toBe("Ничего не найдено по запросу «дуб».");
    expect(emptyObjectsMessage("", "characters", "all")).toBe("В категории «Персонажи» пока нет объектов.");
    expect(emptyObjectsMessage("", "all", "pending")).toBe("Нет объектов с таким статусом.");
  });
});

describe("object removal", () => {
  it("lets the author delete drafts and published objects", () => {
    expect(canDeleteObject(object({ id: "a", title: "Черновик", status: "pending" }))).toBe(true);
    expect(canDeleteObject(object({ id: "b", title: "Отказ", status: "rejected" }))).toBe(true);
    expect(canDeleteObject(object({ id: "c", title: "Живой", status: "published" }))).toBe(true);
  });

  it("explains a draft erase and a published handoff differently", () => {
    expect(removalConfirm([object({ id: "a", title: "Черновик", status: "pending" })]).description).toContain(
      "безвозвратно",
    );
    expect(removalConfirm([object({ id: "c", title: "Живой", status: "published" })]).description).toContain(
      "каталоге Twilite",
    );
    expect(removalSuccess(0, 1).title).toBe("Объект передан Twilite");
    expect(removalSuccess(1, 0).title).toBe("Объект удалён");
  });
});

describe("paginate", () => {
  const items = ["a", "b", "c", "d", "e"];

  it("slices a page and clamps the index", () => {
    expect(paginate(items, 2, 2)).toEqual({ page: 2, pageCount: 3, items: ["c", "d"] });
    expect(paginate(items, 9, 2).page).toBe(3);
  });

  it("inserts gaps in a long page window", () => {
    expect(pageWindow(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10]);
  });
});
