import { describe, expect, it } from "vitest";
import { formatColorField, parseColorField } from "./colorFormat";

describe("color format round trip", () => {
  it("parses rgb and rgba", () => {
    expect(parseColorField("27, 85, 224", "rgb", 100)).toEqual({
      hex: "#1b55e0",
      alphaPercent: 100,
    });
    expect(parseColorField("27, 85, 224, 50%", "rgba", 100)).toEqual({
      hex: "#1b55e0",
      alphaPercent: 50,
    });
  });

  it("formats and parses hsl", () => {
    const hex = "#ff0000";
    const text = formatColorField(hex, 100, "hsl");
    const parsed = parseColorField(text, "hsl", 100);
    expect(parsed?.hex).toBe(hex);
  });
});
