import { useHotkey } from "@/shared/hooks/useHotkey";
import { APP_HOTKEYS } from "@/shared/const/hotkeys";

/** Thin wrapper kept for call-sites that only need Escape. */
export function useEscapeKey(enabled: boolean, onEscape: () => void): void {
  useHotkey(APP_HOTKEYS.CLOSE_OVERLAY, onEscape, {
    enabled,
    ignoreInputs: false,
    preventDefault: true,
  });
}
