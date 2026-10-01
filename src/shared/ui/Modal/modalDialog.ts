import type { RefObject } from "react";
import { lockPageScroll } from "./scrollLock";

export function openModal(dialog: HTMLDialogElement): void {
  if (dialog.open) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }
  dialog.setAttribute("open", "");
}

export function closeModal(dialog: HTMLDialogElement): void {
  if (typeof dialog.close === "function") {
    if (dialog.open) dialog.close();
    return;
  }
  dialog.removeAttribute("open");
}

export function restoreFocus(target: Element | null): void {
  if (!(target instanceof HTMLElement) || !target.isConnected) return;
  target.focus();
}

function connected(nodes: Array<HTMLElement | null | undefined>): HTMLElement | null {
  return nodes.find((node) => node?.isConnected) ?? null;
}

export function focusInitial(dialog: HTMLElement, preferred: HTMLElement | null): void {
  const marked = dialog.querySelector<HTMLElement>("[data-autofocus], [autofocus]");
  const title = dialog.querySelector<HTMLElement>("[data-modal-initial]");
  const target = connected([preferred, marked, title]) ?? dialog;
  target.focus();
}

type ModalRefs = {
  onClose: RefObject<() => void>;
  closeOnEscape: RefObject<boolean>;
  initialFocusRef: RefObject<RefObject<HTMLElement | null> | undefined>;
};

export function attachModal(dialog: HTMLDialogElement, refs: ModalRefs): () => void {
  const previouslyFocused = document.activeElement;
  openModal(dialog);
  focusInitial(dialog, refs.initialFocusRef.current?.current ?? null);
  const unlock = lockPageScroll();
  const onCancel = (event: Event) => {
    event.preventDefault();
    if (refs.closeOnEscape.current) refs.onClose.current();
  };
  dialog.addEventListener("cancel", onCancel);
  return () => detachModal(dialog, onCancel, unlock, previouslyFocused);
}

function detachModal(dialog: HTMLDialogElement, onCancel: (event: Event) => void, unlock: () => void, previouslyFocused: Element | null) {
  dialog.removeEventListener("cancel", onCancel);
  closeModal(dialog);
  unlock();
  restoreFocus(previouslyFocused);
}
