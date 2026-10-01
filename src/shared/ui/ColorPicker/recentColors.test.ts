import { describe, expect, it } from "vitest";
import { pushRecentColor, RECENT_COLORS_MAX } from "./recentColors";

describe("pushRecentColor", () => {
  it("moves duplicates to the front", () => {
    expect(pushRecentColor(["#111111", "#222222"], "#222222")).toEqual([
      "#222222",
      "#111111",
    ]);
  });

  it("caps the list at RECENT_COLORS_MAX", () => {
    const seed = Array.from({ length: RECENT_COLORS_MAX }, (_, index) =>
      `#${index.toString(16).padStart(6, "0")}`,
    );
    const next = pushRecentColor(seed, "#ffffff");
    expect(next).toHaveLength(RECENT_COLORS_MAX);
    expect(next[0]).toBe("#ffffff");
  });
});
