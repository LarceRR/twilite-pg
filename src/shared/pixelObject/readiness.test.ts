import { describe, expect, it } from "vitest";

import { submitBlocker } from "./readiness";

const ready = {
  title: "Spark",
  frameCount: 1,
  opaque: true,
  canSubmit: true,
};

describe("submitBlocker", () => {
  it("allows a titled opaque document when the user can submit", () => {
    expect(submitBlocker(ready)).toBeNull();
  });

  it("requires a title, visible pixels, and permission", () => {
    expect(submitBlocker({ ...ready, title: "  " })).toMatch(/название/);
    expect(submitBlocker({ ...ready, opaque: false })).toMatch(/непрозрачный/);
    expect(submitBlocker({ ...ready, canSubmit: false })).toMatch(/прав/);
    expect(submitBlocker({ ...ready, frameCount: 65 })).toMatch(/64/);
  });

  it("blocks catalog submit when canvas exceeds canvasMax", () => {
    expect(
      submitBlocker({ ...ready, width: 320, height: 200, canvasMax: 160 }),
    ).toMatch(/320×200/);
  });
});
