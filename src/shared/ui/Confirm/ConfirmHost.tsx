import { useEffect, useRef, useState } from "react";

import { Modal } from "@/shared/ui/Modal";

import { useConfirmStore } from "./confirmStore";
import type { ConfirmRequest } from "./confirmTypes";
import "./Confirm.scss";

export function ConfirmHost() {
  const current = useConfirmStore((state) => state.current);
  const settle = useConfirmStore((state) => state.settle);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [display, setDisplay] = useState<ConfirmRequest | null>(current);

  useEffect(() => {
    if (current) {
      setDisplay(current);
    }
  }, [current]);

  const open = current !== null;
  const request = current ?? display;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (current) {
          settle(current.id, false);
        }
      }}
      title={request?.title ?? ""}
      description={request?.description}
      initialFocusRef={confirmRef}
      className="confirm-dialog"
      closeOnBackdrop
      closeOnEscape
    >
      {request ? (
        <div className="confirm-dialog__actions">
          {request.kind === "confirm" ? (
            <button
              type="button"
              className="confirm-dialog__btn confirm-dialog__btn--secondary"
              onClick={() => settle(request.id, false)}
            >
              {request.cancelLabel}
            </button>
          ) : null}
          <button
            ref={confirmRef}
            type="button"
            className={
              request.danger
                ? "confirm-dialog__btn confirm-dialog__btn--danger"
                : "confirm-dialog__btn confirm-dialog__btn--primary"
            }
            onClick={() => settle(request.id, true)}
          >
            {request.confirmLabel}
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
