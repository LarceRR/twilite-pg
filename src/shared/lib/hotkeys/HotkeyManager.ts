import { detectOperatingSystem } from "@/shared/lib/os/detectOperatingSystem";
import { matchHotkey } from "./matchHotkey";
import { parseHotkey } from "./parseHotkey";
import type {
  HotkeyHandlerOptions,
  HotkeyRegistration,
  ParsedHotkey,
} from "./types";

const DEFAULT_OPTIONS: Required<HotkeyHandlerOptions> = {
  enabled: true,
  preventDefault: true,
  stopPropagation: true,
  ignoreInputs: true,
};

/** Capture phase beats browser UI shortcuts (e.g. Chrome Ctrl+K omnibox). */
const LISTENER_OPTIONS: AddEventListenerOptions = { capture: true };

type InternalRegistration = HotkeyRegistration & {
  parsed: ParsedHotkey;
};

let nextId = 0;

class HotkeyManager {
  private registrations = new Map<string, InternalRegistration>();
  private attached = false;

  register(
    hotkey: string,
    handler: HotkeyRegistration["handler"],
    options: HotkeyHandlerOptions = {},
  ): () => void {
    const id = `hotkey-${nextId++}`;
    this.registrations.set(id, {
      id,
      hotkey,
      handler,
      options: { ...DEFAULT_OPTIONS, ...options },
      parsed: parseHotkey(hotkey),
    });
    this.ensureListener();
    return () => this.unregister(id);
  }

  unregister(id: string): void {
    this.registrations.delete(id);
    if (this.registrations.size === 0) this.detachListener();
  }

  private ensureListener(): void {
    if (this.attached || typeof window === "undefined") return;
    window.addEventListener("keydown", this.onKeyDown, LISTENER_OPTIONS);
    this.attached = true;
  }

  private detachListener(): void {
    if (!this.attached || typeof window === "undefined") return;
    window.removeEventListener("keydown", this.onKeyDown, LISTENER_OPTIONS);
    this.attached = false;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) return;

    const os = detectOperatingSystem();

    for (const registration of this.registrations.values()) {
      if (this.tryHandle(event, registration, os)) break;
    }
  };

  private tryHandle(
    event: KeyboardEvent,
    registration: InternalRegistration,
    os: ReturnType<typeof detectOperatingSystem>,
  ): boolean {
    const { options, parsed, handler } = registration;
    if (!options.enabled) return false;
    if (options.ignoreInputs && isEditableTarget(event.target)) return false;
    if (!matchHotkey(event, parsed, os)) return false;

    claimKeyboardEvent(event, options);
    handler(event);
    return true;
  }
}

function claimKeyboardEvent(
  event: KeyboardEvent,
  options: Required<HotkeyHandlerOptions>,
): void {
  if (options.preventDefault) event.preventDefault();
  if (options.stopPropagation) {
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export const hotkeyManager = new HotkeyManager();
