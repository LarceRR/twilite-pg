import type { TooltipHandlers } from "./tooltipAnchor";

type TooltipState = {
  open: boolean;
  sync: (immediate: boolean) => void;
  hovered: { current: boolean };
  focused: { current: boolean };
  dismiss: () => void;
};

export function holdTooltip(state: TooltipState) {
  state.hovered.current = true;
  state.sync(false);
}

export function releaseTooltip(state: TooltipState) {
  state.hovered.current = false;
  state.sync(false);
}

export function tooltipTriggerHandlers(state: TooltipState): TooltipHandlers {
  return {
    onPointerEnter: (event) => {
      if (event.pointerType === "touch") return;
      holdTooltip(state);
    },
    onPointerLeave: () => releaseTooltip(state),
    onFocus: () => {
      state.focused.current = true;
      state.sync(true);
    },
    onBlur: () => {
      state.focused.current = false;
      state.sync(false);
    },
    onKeyDown: (event) => {
      if (event.key !== "Escape" || !state.open) return;
      event.preventDefault();
      event.stopPropagation();
      state.dismiss();
    },
  };
}
