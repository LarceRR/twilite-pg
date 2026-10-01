import type { OperatingSystem } from "@/shared/lib/os/detectOperatingSystem";
import { isAppleOS } from "@/shared/lib/os/detectOperatingSystem";
import type { ParsedHotkey } from "./types";

export function matchHotkey(
  event: KeyboardEvent,
  parsed: ParsedHotkey,
  os: OperatingSystem,
): boolean {
  if (!keysEqual(event, parsed.key)) return false;
  if (event.altKey !== parsed.alt) return false;
  if (event.shiftKey !== parsed.shift) return false;

  return matchPrimaryModifiers(event, parsed, os);
}

function matchPrimaryModifiers(
  event: KeyboardEvent,
  parsed: ParsedHotkey,
  os: OperatingSystem,
): boolean {
  if (parsed.mod) {
    return isAppleOS(os) ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  }

  return event.ctrlKey === parsed.ctrl && event.metaKey === parsed.meta;
}

function keysEqual(event: KeyboardEvent, expected: string): boolean {
  const right = expected.toLowerCase();
  const left = event.key.toLowerCase();

  if (left === right) return true;
  if (left === " " && right === "space") return true;
  if (left === "esc" && right === "escape") return true;

  // Prefer physical key so Ctrl/Alt layouts still match letter chords.
  if (right.length === 1) {
    return event.code.toLowerCase() === `key${right}`;
  }

  return event.code.toLowerCase() === right;
}
