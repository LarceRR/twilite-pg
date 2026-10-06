import { useLayoutEffect, useState, type Dispatch, type RefObject, type SetStateAction } from "react";

import {
  placeTooltip,
  samePlacement,
  type Placement,
  type Side,
} from "@/shared/ui/Tooltip/placeTooltip";
import {
  readLayoutRect,
  readLayoutViewport,
  resolveSide,
} from "@/shared/ui/Tooltip/tooltipLayout";

export const POPOVER_OFFSET = 6;
export const POPOVER_PADDING = 8;

function observeNodes(update: () => void, nodes: Array<Element | null>): () => void {
  if (typeof ResizeObserver !== "function") {
    return () => {};
  }
  const observer = new ResizeObserver(update);
  for (const node of nodes) {
    if (node) {
      observer.observe(node);
    }
  }
  return () => observer.disconnect();
}

function watchPlacement(update: () => void, nodes: Array<Element | null>): () => void {
  const stopObserve = observeNodes(update, nodes);
  window.addEventListener("scroll", update, true);
  window.addEventListener("resize", update);
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
  return () => {
    stopObserve();
    window.removeEventListener("scroll", update, true);
    window.removeEventListener("resize", update);
    window.visualViewport?.removeEventListener("resize", update);
    window.visualViewport?.removeEventListener("scroll", update);
  };
}

function placeAt(anchor: HTMLElement, popup: HTMLElement, placement: Side): Placement | null {
  return placeTooltip(
    readLayoutRect(anchor.getBoundingClientRect()),
    { width: popup.offsetWidth, height: popup.offsetHeight },
    readLayoutViewport(),
    resolveSide(placement),
    POPOVER_OFFSET,
    POPOVER_PADDING,
  );
}

export function measurePopoverPlacement(
  anchor: HTMLElement,
  popup: HTMLElement,
  placement: Side,
): Placement | null {
  popup.style.maxWidth = "";
  popup.style.maxHeight = "";
  const natural = placeAt(anchor, popup, placement);
  if (!natural) {
    return null;
  }
  popup.style.maxWidth = `${natural.maxWidth}px`;
  popup.style.maxHeight = `${natural.maxHeight}px`;
  return placeAt(anchor, popup, placement);
}

function publishPlacement(
  anchor: HTMLElement | null,
  popup: HTMLElement | null,
  placement: Side,
  setCoords: Dispatch<SetStateAction<Placement | null>>,
): void {
  if (!anchor || !popup) {
    return;
  }
  const next = measurePopoverPlacement(anchor, popup, placement);
  if (next) {
    popup.style.top = `${next.top}px`;
    popup.style.left = `${next.left}px`;
  }
  setCoords((current) => (samePlacement(current, next) ? current : next));
}

export function usePopoverPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  popupRef: RefObject<HTMLElement | null>,
  placement: Side,
): Placement | null {
  const [coords, setCoords] = useState<Placement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const update = () => publishPlacement(anchorRef.current, popupRef.current, placement, setCoords);
    update();
    return watchPlacement(update, [anchorRef.current, popupRef.current]);
  }, [anchorRef, open, placement, popupRef]);

  return coords;
}

export type { Placement, Side };
