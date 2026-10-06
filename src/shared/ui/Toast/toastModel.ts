import type { ToastInput, ToastRecord, ToastType } from "./toastTypes";
import { TOAST_DEFAULT_DURATION } from "./toastTypes";

export function buildDedupeKey(input: {
  type: ToastType;
  title: string;
  description?: string;
  dedupeKey?: string;
}): string {
  if (input.dedupeKey && input.dedupeKey.trim().length > 0) {
    return input.dedupeKey.trim();
  }
  const description = input.description?.trim() ?? "";
  return `${input.type}:${input.title.trim()}:${description}`;
}

/** Duplicate marker label: "x2", "x3". Count 1 has no marker. */
export function formatToastCountLabel(count: number): string | null {
  if (count <= 1) {
    return null;
  }
  return `x${count}`;
}

export function createToastId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeToastInput(input: ToastInput): Omit<ToastRecord, "id" | "count" | "createdAt"> {
  const type = input.type ?? "info";
  const title = input.title.trim();
  const description = input.description?.trim() || undefined;
  return {
    title,
    description,
    type,
    duration: input.duration ?? TOAST_DEFAULT_DURATION[type],
    dedupeKey: buildDedupeKey({ type, title, description, dedupeKey: input.dedupeKey }),
  };
}

export type PushToastResult =
  | { kind: "created"; toast: ToastRecord; evictedId: string | null }
  | { kind: "bumped"; toast: ToastRecord };

export function pushToastIntoList(
  toasts: readonly ToastRecord[],
  input: ToastInput,
  maxVisible: number,
  now = Date.now(),
): { toasts: ToastRecord[]; result: PushToastResult | null } {
  const normalized = normalizeToastInput(input);
  if (normalized.title.length === 0) {
    return { toasts: [...toasts], result: null };
  }

  const existingIndex = toasts.findIndex((toast) => toast.dedupeKey === normalized.dedupeKey);
  if (existingIndex >= 0) {
    const previous = toasts[existingIndex]!;
    const bumped: ToastRecord = {
      ...previous,
      ...normalized,
      id: previous.id,
      count: previous.count + 1,
      createdAt: now,
    };
    const next = [...toasts];
    next.splice(existingIndex, 1);
    next.unshift(bumped);
    return { toasts: next, result: { kind: "bumped", toast: bumped } };
  }

  const created: ToastRecord = {
    id: createToastId(),
    ...normalized,
    count: 1,
    createdAt: now,
  };
  let next = [created, ...toasts];
  let evictedId: string | null = null;
  if (next.length > maxVisible) {
    const overflow = next.slice(maxVisible);
    next = next.slice(0, maxVisible);
    evictedId = overflow[overflow.length - 1]?.id ?? null;
  }
  return { toasts: next, result: { kind: "created", toast: created, evictedId } };
}

export function dismissToastFromList(
  toasts: readonly ToastRecord[],
  id: string,
): ToastRecord[] {
  return toasts.filter((toast) => toast.id !== id);
}
