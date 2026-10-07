import { describe, expect, it } from "vitest";

import { submitBlocker } from "./readiness";

const ready = {
  title: "Spark",
  frameCount: 1,
  opaque: true,
  canSubmit: true,
  projectId: "11111111-1111-4111-8111-111111111111",
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

  it("requires a projectId", () => {
    expect(submitBlocker({ ...ready, projectId: null })).toMatch(/проект/i);
  });

  it("blocks catalog submit when canvas exceeds canvasMax", () => {
    expect(
      submitBlocker({ ...ready, width: 320, height: 200, canvasMax: 160 }),
    ).toMatch(/320×200/);
  });
});
