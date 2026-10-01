import { describe, expect, it } from "vitest";

import { safeInternalPath } from "./safeRedirect";

describe("safeInternalPath", () => {
  it("allows in-app paths", () => {
    expect(safeInternalPath("/new-project")).toBe("/new-project");
    expect(safeInternalPath("/cabinet?tab=1")).toBe("/cabinet?tab=1");
  });

  it("blocks open redirects and login loops", () => {
    expect(safeInternalPath("https://evil.test")).toBe("/");
    expect(safeInternalPath("//evil.test")).toBe("/");
    expect(safeInternalPath("/log-in")).toBe("/");
    expect(safeInternalPath("/log-in?next=/")).toBe("/");
    expect(safeInternalPath(null)).toBe("/");
  });
});
