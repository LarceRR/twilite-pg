import { useEffect, useRef } from "react";
import { hotkeyManager } from "@/shared/lib/hotkeys";
import type { HotkeyHandlerOptions } from "@/shared/lib/hotkeys";

/**
 * Registers a single hotkey. Chord format: "Mod+K", "Shift+Alt+S", "Escape".
 * `Mod` = ⌘ on macOS, Ctrl on Windows/Linux.
 */
export function useHotkey(
  hotkey: string,
  handler: (event: KeyboardEvent) => void,
  options: HotkeyHandlerOptions = {},
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = true,
    ignoreInputs = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    return hotkeyManager.register(
      hotkey,
      (event) => handlerRef.current(event),
      { enabled, preventDefault, stopPropagation, ignoreInputs },
    );
  }, [hotkey, enabled, preventDefault, stopPropagation, ignoreInputs]);
}
