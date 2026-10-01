import { forwardRef, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { Placement } from "./placeTooltip";
import type { TooltipChild } from "./tooltipAnchor";
import { TooltipBody } from "./TooltipBody";

type TooltipPopupProps = {
  id: string;
  coords: Placement | null;
  asLabel: boolean;
  interactive: boolean;
  children: TooltipChild;
  onPointerEnter: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLDivElement>) => void;
};

function popupStyle(coords: Placement | null): { top: number; left: number } | undefined {
  if (!coords) return undefined;
  return { top: coords.top, left: coords.left };
}

export const TooltipPopup = forwardRef<HTMLDivElement, TooltipPopupProps>(function TooltipPopup(props, ref) {
  const ready = props.coords !== null;
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      id={props.id}
      role={props.asLabel ? undefined : "tooltip"}
      className={props.interactive ? "tooltip tooltip--interactive" : "tooltip"}
      data-side={props.coords?.side}
      data-ready={ready ? "true" : "false"}
      aria-hidden={ready ? undefined : true}
      style={popupStyle(props.coords)}
      onPointerEnter={props.interactive ? props.onPointerEnter : undefined}
      onPointerLeave={props.interactive ? props.onPointerLeave : undefined}
    >
      <TooltipBody>{props.children}</TooltipBody>
    </div>,
    document.body,
  );
});
