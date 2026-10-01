import { useRef, type ReactElement, type ReactNode, type RefObject } from "react";
import type { Side } from "./placeTooltip";
import type { Placement } from "./placeTooltip";
import { hasTooltipContent, renderTooltipAnchor, type TooltipChild } from "./tooltipAnchor";
import { TooltipPopup } from "./TooltipPopup";
import { useTooltipOpen } from "./useTooltipOpen";
import { useTooltipPosition } from "./tooltipLayout";
import { holdTooltip, releaseTooltip, tooltipTriggerHandlers } from "./tooltipTrigger";
import "./Tooltip.scss";

export type TooltipProps = {
  children: ReactElement;
  /** Tooltip body. A promise shows a spinner until it settles. Keep the promise stable. */
  content: ReactNode;
  placement?: Side;
  openDelay?: number;
  closeDelay?: number;
  disabled?: boolean;
  /** Use the tooltip as the trigger's accessible name when the trigger has none. */
  asLabel?: boolean;
  /** Let the pointer move onto the tooltip. Leave this off for plain hints. */
  interactive?: boolean;
};

type TooltipState = ReturnType<typeof useTooltipOpen>;

function useFrozenWhileOpen<T>(value: T, open: boolean): T {
  const frozen = useRef(value);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) frozen.current = value;
  wasOpen.current = open;
  return open ? frozen.current : value;
}

type TooltipViewProps = {
  trigger: ReactElement;
  state: TooltipState;
  content: TooltipChild;
  coords: Placement | null;
  anchorRef: RefObject<HTMLElement | null>;
  popupRef: RefObject<HTMLDivElement | null>;
  asLabel: boolean;
  interactive: boolean;
};

function TooltipView({ state, content, coords, anchorRef, popupRef, trigger, asLabel = false, interactive = false }: TooltipViewProps) {
  const ready = coords !== null;
  return (
    <>
      {renderTooltipAnchor({
        trigger,
        anchorRef,
        handlers: tooltipTriggerHandlers(state),
        describedBy: ready && !asLabel ? state.id : undefined,
        labelledBy: ready && asLabel ? state.id : undefined,
      })}
      {state.open ? (
        <TooltipPopup
          ref={popupRef}
          id={state.id}
          coords={coords}
          asLabel={asLabel}
          interactive={interactive}
          onPointerEnter={() => holdTooltip(state)}
          onPointerLeave={() => releaseTooltip(state)}
        >
          {content}
        </TooltipPopup>
      ) : null}
    </>
  );
}

export function Tooltip({
  children,
  content,
  placement = "top",
  openDelay = 400,
  closeDelay = 120,
  disabled = false,
  asLabel = false,
  interactive = false,
}: TooltipProps) {
  const anchorRef = useRef<HTMLElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const state = useTooltipOpen(!disabled && hasTooltipContent(content), openDelay, closeDelay);
  const frozen = useFrozenWhileOpen(content, state.open);
  const coords = useTooltipPosition(state.open, anchorRef, popupRef, placement);
  return (
    <TooltipView
      trigger={children}
      state={state}
      content={frozen}
      coords={coords}
      anchorRef={anchorRef}
      popupRef={popupRef}
      asLabel={asLabel}
      interactive={interactive}
    />
  );
}
