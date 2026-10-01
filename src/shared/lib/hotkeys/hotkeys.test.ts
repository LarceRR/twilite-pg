import { describe, expect, it } from "vitest";
import { formatHotkeyParts, matchHotkey, parseHotkey } from "@/shared/lib/hotkeys";

describe("parseHotkey", () => {
  it("parses Mod+K", () => {
    expect(parseHotkey("Mod+K")).toMatchObject({
      key: "k",
      mod: true,
      shift: false,
    });
  });

  it("parses multi-modifier chords", () => {
    expect(parseHotkey("Shift+Alt+ArrowUp")).toMatchObject({
      key: "arrowup",
      shift: true,
      alt: true,
    });
  });
});

describe("matchHotkey", () => {
  it("matches Ctrl+K on windows", () => {
    const event = {
      key: "k",
      code: "KeyK",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    } as KeyboardEvent;

    expect(matchHotkey(event, parseHotkey("Mod+K"), "windows")).toBe(true);
  });

  it("matches Meta+K on mac", () => {
    const event = {
      key: "k",
      code: "KeyK",
      ctrlKey: false,
      metaKey: true,
      altKey: false,
      shiftKey: false,
    } as KeyboardEvent;

    expect(matchHotkey(event, parseHotkey("Mod+K"), "mac")).toBe(true);
  });
});

describe("formatHotkeyParts", () => {
  it("shows Ctrl on windows and command glyph on mac", () => {
    expect(formatHotkeyParts("Mod+K", "windows").map((p) => p.label)).toEqual([
      "Ctrl",
      "K",
    ]);
    expect(formatHotkeyParts("Mod+K", "mac")[0]?.label).toBe("⌘");
  });
});
