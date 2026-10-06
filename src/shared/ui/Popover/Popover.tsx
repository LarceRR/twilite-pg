import {
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { renderPopoverTrigger } from "./popoverTrigger";
import { usePopoverPosition, type Side } from "./usePopoverPosition";
import "./Popover.scss";

export type PopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactElement;
  content: ReactNode;
  placement?: Side;
  className?: string;
  disabled?: boolean;
};

function panelClass(className?: string): string {
  return className ? `popover ${className}` : "popover";
}

export function Popover({
  open,
  onOpenChange,
  children,
  content,
  placement = "bottom",
  className,
  disabled = false,
}: PopoverProps) {
  const popupId = useId();
  const anchorRef = useRef<HTMLElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const coords = usePopoverPosition(open && !disabled, anchorRef, popupRef, placement);

  useEffect(() => {
    if (!open || disabled) {
      return;
    }

    function onPointerDown(event: PointerEvent): void {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (anchorRef.current?.contains(target) || popupRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [disabled, onOpenChange, open]);

  const trigger = renderPopoverTrigger({
    trigger: children,
    anchorRef,
    open,
    popupId,
    disabled,
    onToggle: () => onOpenChange(!open),
  });

  if (typeof document === "undefined") {
    return trigger;
  }

  return (
    <>
      {trigger}
      {open && !disabled
        ? createPortal(
            <div
              ref={popupRef}
              id={popupId}
              className={panelClass(className)}
              data-side={coords?.side}
              data-ready={coords ? "true" : "false"}
              style={coords ? { top: coords.top, left: coords.left } : undefined}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
