import { useId, type AnimationEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useModalDialog } from "./useModalDialog";
import { useModalExit, useModalPresence } from "./modalPresence";
import "./Modal.scss";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
};

type FrameProps = ModalProps & {
  onExited: () => void;
};

function panelClass(className?: string): string {
  return className ? `modal__panel ${className}` : "modal__panel";
}

function finishExit(event: AnimationEvent<HTMLElement>, open: boolean, onExited: () => void) {
  if (!open && event.target === event.currentTarget) onExited();
}

function ModalHeader({ titleId, title, onClose }: { titleId: string; title: string; onClose: () => void }) {
  return (
    <header className="modal__header">
      <h2 id={titleId} className="modal__title" tabIndex={-1} data-modal-initial>
        {title}
      </h2>
      <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
        <X size={16} aria-hidden="true" />
      </button>
    </header>
  );
}

function ModalDialog(props: FrameProps & { titleId: string; descriptionId: string; dialogRef: RefObject<HTMLDialogElement | null> }) {
  const closeOnBackdrop = props.closeOnBackdrop !== false;
  return (
    <dialog
      ref={props.dialogRef}
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={props.titleId}
      aria-describedby={props.description ? props.descriptionId : undefined}
      data-closing={props.open ? "false" : "true"}
      tabIndex={-1}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) props.onClose();
      }}
    >
      <div className={panelClass(props.className)} onAnimationEnd={(event) => finishExit(event, props.open, props.onExited)}>
        <ModalHeader titleId={props.titleId} title={props.title} onClose={props.onClose} />
        {props.description ? <p id={props.descriptionId} className="modal__description">{props.description}</p> : null}
        <div className="modal__body">{props.children}</div>
      </div>
    </dialog>
  );
}

function ModalFrame(props: FrameProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useModalDialog(props.onClose, props.closeOnEscape !== false, props.initialFocusRef);
  useModalExit(props.open, props.onExited);
  if (typeof document === "undefined") return null;
  return createPortal(
    <ModalDialog {...props} titleId={titleId} descriptionId={descriptionId} dialogRef={dialogRef} />,
    document.body,
  );
}

export function Modal(props: ModalProps) {
  const presence = useModalPresence(props.open);
  if (!presence.present) return null;
  return <ModalFrame {...props} onExited={presence.onExited} />;
}
