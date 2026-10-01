import type { OperatingSystem } from "@/shared/lib/os/detectOperatingSystem";
import { isAppleOS } from "@/shared/lib/os/detectOperatingSystem";
import { parseHotkey } from "./parseHotkey";

export interface FormattedHotkeyPart {
  type: "mod" | "ctrl" | "meta" | "alt" | "shift" | "key";
  label: string;
}

/** Splits a hotkey into UI-friendly parts for the current OS. */
export function formatHotkeyParts(
  hotkey: string,
  os: OperatingSystem,
): FormattedHotkeyPart[] {
  const parsed = parseHotkey(hotkey);
  const parts: FormattedHotkeyPart[] = [];

  if (parsed.mod) {
    parts.push({
      type: "mod",
      label: isAppleOS(os) ? "⌘" : "Ctrl",
    });
  }

  if (parsed.ctrl && !parsed.mod) parts.push({ type: "ctrl", label: "Ctrl" });
  if (parsed.meta && !parsed.mod) {
    parts.push({ type: "meta", label: isAppleOS(os) ? "⌘" : "Win" });
  }
  if (parsed.alt) {
    parts.push({ type: "alt", label: isAppleOS(os) ? "⌥" : "Alt" });
  }
  if (parsed.shift) {
    parts.push({ type: "shift", label: isAppleOS(os) ? "⇧" : "Shift" });
  }

  parts.push({ type: "key", label: formatKeyLabel(parsed.key) });
  return parts;
}

function formatKeyLabel(key: string): string {
  if (key === "escape") return "Esc";
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}
