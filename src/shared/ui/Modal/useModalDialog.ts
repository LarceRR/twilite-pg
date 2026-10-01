import { useLayoutEffect, useRef, type RefObject } from "react";
import { attachModal } from "./modalDialog";

export function useModalDialog(
  onClose: () => void,
  closeOnEscape: boolean,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const escapeRef = useRef(closeOnEscape);
  const focusRef = useRef(initialFocusRef);
  onCloseRef.current = onClose;
  escapeRef.current = closeOnEscape;
  focusRef.current = initialFocusRef;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    return attachModal(dialog, {
      onClose: onCloseRef,
      closeOnEscape: escapeRef,
      initialFocusRef: focusRef,
    });
  }, []);

  return dialogRef;
}
