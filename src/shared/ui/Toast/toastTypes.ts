export type ToastType = "info" | "warn" | "success" | "error";

export type ToastInput = {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  /** Stable key for collapsing duplicates. Defaults to type+title+description. */
  dedupeKey?: string;
};

export type ToastRecord = {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration: number;
  dedupeKey: string;
  count: number;
  createdAt: number;
};

export type ToastHeightEntry = {
  id: string;
  height: number;
};

export const TOAST_DEFAULT_DURATION: Readonly<Record<ToastType, number>> = {
  info: 4000,
  success: 4000,
  warn: 5000,
  /** Sticky: only closed manually. */
  error: 0,
};

export const TOAST_GAP_PX = 12;
export const TOAST_STACK_OFFSET_PX = 14;
export const TOAST_STACK_SCALE_STEP = 0.05;
export const TOAST_MAX_VISIBLE = 5;
