import { create } from "zustand";

import {
  dismissToastFromList,
  pushToastIntoList,
  type PushToastResult,
} from "./toastModel";
import type { ToastInput, ToastRecord } from "./toastTypes";
import { TOAST_MAX_VISIBLE } from "./toastTypes";

type ToastStoreState = {
  toasts: ToastRecord[];
  expanded: boolean;
  exitingIds: readonly string[];
  push: (input: ToastInput) => PushToastResult | null;
  dismiss: (id: string) => void;
  beginExit: (id: string) => void;
  finishExit: (id: string) => void;
  dismissAll: () => void;
  setExpanded: (expanded: boolean) => void;
};

export const useToastStore = create<ToastStoreState>((set, get) => ({
  toasts: [],
  expanded: false,
  exitingIds: [],
  push: (input) => {
    const { toasts, result } = pushToastIntoList(get().toasts, input, TOAST_MAX_VISIBLE);
    set({ toasts });
    return result;
  },
  dismiss: (id) => {
    set({
      toasts: dismissToastFromList(get().toasts, id),
      exitingIds: get().exitingIds.filter((item) => item !== id),
    });
  },
  beginExit: (id) => {
    if (get().exitingIds.includes(id)) {
      return;
    }
    if (!get().toasts.some((toast) => toast.id === id)) {
      return;
    }
    set({ exitingIds: [...get().exitingIds, id] });
  },
  finishExit: (id) => {
    set({
      toasts: dismissToastFromList(get().toasts, id),
      exitingIds: get().exitingIds.filter((item) => item !== id),
    });
  },
  dismissAll: () => {
    set({ toasts: [], exitingIds: [] });
  },
  setExpanded: (expanded) => {
    set({ expanded });
  },
}));
