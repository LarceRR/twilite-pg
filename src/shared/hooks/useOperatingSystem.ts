import { useSyncExternalStore } from "react";
import {
  detectOperatingSystem,
  type OperatingSystem,
} from "@/shared/lib/os/detectOperatingSystem";

let cachedOS: OperatingSystem | null = null;

function getOS(): OperatingSystem {
  if (cachedOS) return cachedOS;
  cachedOS = detectOperatingSystem();
  return cachedOS;
}

function subscribe(): () => void {
  return () => undefined;
}

/** Shared OS detector for keybinds and platform-specific UI. */
export function useOperatingSystem(): OperatingSystem {
  return useSyncExternalStore(subscribe, getOS, () => "unknown");
}
