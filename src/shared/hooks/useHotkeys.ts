import { useEffect, useRef } from "react";
import { hotkeyManager } from "@/shared/lib/hotkeys";
import type { HotkeyDefinition, HotkeyHandlerOptions } from "@/shared/lib/hotkeys";

/** Register multiple hotkeys in one place — safe for dynamic lists. */
export function useHotkeys(
  definitions: HotkeyDefinition[],
  commonOptions: HotkeyHandlerOptions = {},
): void {
  const definitionsRef = useRef(definitions);
  definitionsRef.current = definitions;

  const signature = definitions
    .map((item) => `${item.hotkey}:${item.options?.enabled ?? true}`)
    .join("|");

  useEffect(() => {
    const unsubscribers = definitionsRef.current.map((definition) => {
      const options = { ...commonOptions, ...definition.options };
      if (options.enabled === false) return () => undefined;

      return hotkeyManager.register(
        definition.hotkey,
        (event) => {
          const current = definitionsRef.current.find(
            (item) => item.hotkey === definition.hotkey,
          );
          current?.handler(event);
        },
        options,
      );
    });

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [signature, commonOptions.enabled, commonOptions.ignoreInputs, commonOptions.preventDefault, commonOptions.stopPropagation]);
}
