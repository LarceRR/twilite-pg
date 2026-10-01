import { describe, expect, it } from "vitest";

import { userInitials } from "./userInitials";

describe("userInitials", () => {
  it("uses two letters from a full name", () => {
    expect(userInitials("Anna Petrova")).toBe("AP");
  });

  it("falls back for a single word or empty name", () => {
    expect(userInitials("Maku")).toBe("MA");
    expect(userInitials("   ")).toBe("?");
  });
});
