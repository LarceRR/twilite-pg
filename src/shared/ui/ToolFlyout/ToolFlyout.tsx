import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./ToolFlyout.scss";

type ToolFlyoutProps = {
  children: ReactNode;
  label?: string;
  /** Element the panel sits to the right of. */
  anchor: HTMLElement | null;
};

/** Glass panel to the right of an expandable tool. Portaled so parents cannot clip it. */
export function ToolFlyout({ children, label, anchor }: ToolFlyoutProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor) {
      setPos(null);
      return;
    }

    const update = () => {
      const rect = anchor.getBoundingClientRect();
      setPos({
        top: rect.top,
        left: rect.right + 8,
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchor]);

  if (!pos || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={panelRef}
      className="tool-flyout"
      role="group"
      aria-label={label}
      style={{ top: pos.top, left: pos.left }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
