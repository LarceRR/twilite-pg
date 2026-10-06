import {
  clearToastTimer,
  pauseToastTimer,
  scheduleToastDismiss,
} from "./toastTimers";
import { useToastStore } from "./toastStore";
import type { ToastInput, ToastType } from "./toastTypes";

function beginExit(id: string): void {
  clearToastTimer(id);
  useToastStore.getState().beginExit(id);
}

function dismissNow(id: string): void {
  clearToastTimer(id);
  useToastStore.getState().dismiss(id);
}

function push(input: ToastInput): string {
  const state = useToastStore.getState();
  const result = state.push(input);
  if (!result) {
    return "";
  }

  const item = result.toast;

  if (result.kind === "created" && result.evictedId) {
    beginExit(result.evictedId);
  }

  scheduleToastDismiss(item.id, item.duration, () => {
    beginExit(item.id);
  });

  // Hovering the stack must freeze every toast, including brand-new ones.
  if (useToastStore.getState().expanded) {
    pauseToastTimer(item.id);
  }

  return item.id;
}

function typed(type: ToastType) {
  return (title: string, options?: Omit<ToastInput, "title" | "type">) =>
    push({ ...options, title, type });
}

export const toast = Object.assign(push, {
  info: typed("info"),
  warn: typed("warn"),
  success: typed("success"),
  error: typed("error"),
  dismiss: beginExit,
  dismissAll: () => {
    const { toasts, dismissAll } = useToastStore.getState();
    for (const item of toasts) {
      clearToastTimer(item.id);
    }
    dismissAll();
  },
  /** Immediate remove without exit animation (tests / hard reset). */
  dismissNow,
});
