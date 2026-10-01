import type { ParsedHotkey } from "./types";

const MODIFIER_MAP: Record<string, keyof Omit<ParsedHotkey, "key" | "raw">> = {
  mod: "mod",
  ctrl: "ctrl",
  control: "ctrl",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  alt: "alt",
  option: "alt",
  shift: "shift",
};

/** Parses chords like "Mod+K", "Shift+Alt+ArrowUp", "Escape". */
export function parseHotkey(hotkey: string): ParsedHotkey {
  const parts = hotkey
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error(`Invalid hotkey: "${hotkey}"`);
  }

  const parsed: ParsedHotkey = {
    key: "",
    mod: false,
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    raw: hotkey,
  };

  for (const part of parts) {
    applyPart(parsed, part);
  }

  if (!parsed.key) {
    throw new Error(`Hotkey missing key token: "${hotkey}"`);
  }

  return parsed;
}

function applyPart(parsed: ParsedHotkey, part: string): void {
  const lower = part.toLowerCase();
  const modifier = MODIFIER_MAP[lower];

  if (modifier) {
    parsed[modifier] = true;
    return;
  }

  parsed.key = normalizeKeyToken(part);
}

function normalizeKeyToken(token: string): string {
  if (token.length === 1) return token.toLowerCase();
  return token.toLowerCase();
}
