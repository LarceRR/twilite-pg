import { useLayoutEffect, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import {
  mirrorSide,
  placeTooltip,
  samePlacement,
  type Placement,
  type Side,
} from "./placeTooltip";

export const TOOLTIP_OFFSET = 8;
export const TOOLTIP_PADDING = 8;
export const TOOLTIP_MAX_WIDTH = 280;

type ViewportBox = { x: number; y: number; width: number; height: number };

export function readLayoutViewport(): ViewportBox {
  const visual = window.visualViewport;
  if (!visual) return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  return { x: visual.offsetLeft, y: visual.offsetTop, width: visual.width, height: visual.height };
}

export function readLayoutRect(rect: DOMRect): ViewportBox {
  const visual = window.visualViewport;
  return {
    x: rect.left + (visual?.offsetLeft ?? 0),
    y: rect.top + (visual?.offsetTop ?? 0),
    width: rect.width,
    height: rect.height,
  };
}

export function resolveSide(placement: Side): Side {
  return mirrorSide(placement, document.documentElement.dir === "rtl");
}

function observeNodes(update: () => void, nodes: Array<Element | null>): () => void {
  if (typeof ResizeObserver !== "function") return () => {};
  const observer = new ResizeObserver(update);
  for (const node of nodes) if (node) observer.observe(node);
  return () => observer.disconnect();
}

function watchTooltip(update: () => void, nodes: Array<Element | null>): () => void {
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
    TOOLTIP_OFFSET,
    TOOLTIP_PADDING,
  );
}

export function measurePlacement(anchor: HTMLElement, popup: HTMLElement, placement: Side): Placement | null {
  popup.style.maxWidth = "";
  popup.style.maxHeight = "";
  const natural = placeAt(anchor, popup, placement);
  if (!natural) return null;
  popup.style.maxWidth = `${Math.min(TOOLTIP_MAX_WIDTH, natural.maxWidth)}px`;
  popup.style.maxHeight = `${natural.maxHeight}px`;
  return placeAt(anchor, popup, placement);
}

function publishPlacement(
  anchor: HTMLElement | null,
  popup: HTMLElement | null,
  placement: Side,
  setCoords: Dispatch<SetStateAction<Placement | null>>,
) {
  if (!anchor || !popup) return;
  const next = measurePlacement(anchor, popup, placement);
  if (next) {
    popup.style.top = `${next.top}px`;
    popup.style.left = `${next.left}px`;
  }
  setCoords((current) => (samePlacement(current, next) ? current : next));
}

export function useTooltipPosition(
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
    return watchTooltip(update, [anchorRef.current, popupRef.current]);
  }, [anchorRef, open, placement, popupRef]);

  return coords;
}
