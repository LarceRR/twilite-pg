import {
  buildConfirmRequest,
  normalizeAlertInput,
  normalizeConfirmInput,
} from "./confirmModel";
import { useConfirmStore } from "./confirmStore";
import type { AlertOptions, ConfirmOptions } from "./confirmTypes";

function openConfirm(input: string | ConfirmOptions): Promise<boolean> {
  const options = normalizeConfirmInput(input);
  const request = buildConfirmRequest("confirm", options);
  return new Promise<boolean>((resolve) => {
    useConfirmStore.getState().enqueue(request, resolve);
  });
}

function openAlert(input: string | AlertOptions): Promise<void> {
  const options = normalizeAlertInput(input);
  const request = buildConfirmRequest("alert", options);
  return new Promise<void>((resolve) => {
    useConfirmStore.getState().enqueue(request, (confirmed) => {
      void confirmed;
      resolve();
    });
  });
}

/**
 * Imperative dialogs that await user choice.
 * Mount `<ConfirmHost />` once near the app root (next to `<Toaster />`).
 */
export const dialog = {
  /** Blocks until the user confirms (`true`) or cancels (`false`). */
  confirm: openConfirm,
  /** Blocks until the user dismisses the alert. */
  alert: openAlert,
};

export const confirm = openConfirm;
export const alert = openAlert;
