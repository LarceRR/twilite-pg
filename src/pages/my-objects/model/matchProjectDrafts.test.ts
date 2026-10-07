import { describe, expect, it } from "vitest";

import type { ObjectDraftRecord } from "@/shared/pixelObject/objectDraftStore";

import { matchProjectDrafts } from "./matchProjectDrafts";

function draft(title: string, objectType: ObjectDraftRecord["objectType"] = "Good"): ObjectDraftRecord {
  return {
    id: title,
    projectId: "project-1",
    objectType,
    title,
    updatedAt: "2026-01-01T00:00:00.000Z",
    previewPng: null,
    snapshot: {
      width: 1,
      height: 1,
      layers: [],
      activeLayerId: "layer-1",
      frames: [],
      activeFrameId: "frame-1",
      primaryColor: "#000000",
      secondaryColor: "#ffffff",
      onionSkin: false,
    },
  };
}

describe("matchProjectDrafts", () => {
  const drafts = [draft("Фонарь"), draft("Гроза", "Bad")];

  it("keeps local drafts on the unfiltered project list", () => {
    expect(matchProjectDrafts(drafts, "", "all", "all").map((item) => item.title)).toEqual([
      "Фонарь",
      "Гроза",
    ]);
  });

  it("matches the title and hides drafts from status and category filters", () => {
    expect(matchProjectDrafts(drafts, "гроз", "all", "all").map((item) => item.id)).toEqual(["Гроза"]);
    expect(matchProjectDrafts(drafts, "", "pending", "all")).toEqual([]);
    expect(matchProjectDrafts(drafts, "", "all", "nature")).toEqual([]);
  });
});
