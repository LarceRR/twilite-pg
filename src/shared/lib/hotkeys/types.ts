export type ModifierToken = "Mod" | "Ctrl" | "Meta" | "Alt" | "Shift";

export interface ParsedHotkey {
  key: string;
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  raw: string;
}

export interface HotkeyHandlerOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  /** Skip when focus is inside editable fields. Default true. */
  ignoreInputs?: boolean;
}

export interface HotkeyRegistration {
  id: string;
  hotkey: string;
  handler: (event: KeyboardEvent) => void;
  options: Required<HotkeyHandlerOptions>;
}

export type HotkeyDefinition = {
  hotkey: string;
  handler: (event: KeyboardEvent) => void;
  options?: HotkeyHandlerOptions;
};
