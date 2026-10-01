import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";

const DRAG_THRESHOLD_PX = 4;
const SCROLL_EDGE_PX = 28;
const SCROLL_STEP_PX = 14;

type DragSession = {
  pointerId: number;
  originIndex: number;
  hoverIndex: number;
  startX: number;
  startY: number;
  startScroll: number;
  grabX: number;
  size: number;
  gap: number;
  dx: number;
  active: boolean;
};

export type FrameDragState = {
  originIndex: number;
  hoverIndex: number;
  dx: number;
  size: number;
  gap: number;
};

export function frameDragShift(index: number, origin: number, hover: number): number {
  if (index === origin) {
    return 0;
  }
  if (origin < hover && index > origin && index <= hover) {
    return -1;
  }
  if (hover < origin && index >= hover && index < origin) {
    return 1;
  }
  return 0;
}

export function frameDragHoverIndex(itemLeft: number, slot: number, count: number): number {
  if (count <= 1 || slot <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(count - 1, Math.round(itemLeft / slot)));
}

function itemContentLeft(clientX: number, grabX: number, strip: HTMLElement): number {
  const rect = strip.getBoundingClientRect();
  const padLeft = Number.parseFloat(getComputedStyle(strip).paddingLeft) || 0;
  return clientX - grabX - rect.left - padLeft + strip.scrollLeft;
}

export function useFrameStripDrag(options: {
  count: number;
  disabled: boolean;
  stripRef: RefObject<HTMLDivElement | null>;
  onDrop: (fromIndex: number, toIndex: number) => void;
}) {
  const { count, disabled, stripRef, onDrop } = options;
  const sessionRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const [drag, setDrag] = useState<FrameDragState | null>(null);

  const publish = (session: DragSession) => {
    setDrag({
      originIndex: session.originIndex,
      hoverIndex: session.hoverIndex,
      dx: session.dx,
      size: session.size,
      gap: session.gap,
    });
  };

  const endSession = (session: DragSession, dropped: boolean) => {
    if (dropped) {
      suppressClickRef.current = true;
      onDrop(session.originIndex, session.hoverIndex);
    }
    sessionRef.current = null;
    setDrag(null);
  };

  const bindFrame = (index: number) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (disabled || event.button !== 0) {
        return;
      }
      const strip = stripRef.current;
      const rect = event.currentTarget.getBoundingClientRect();
      const gap = strip ? Number.parseFloat(getComputedStyle(strip).columnGap) || 0 : 0;
      sessionRef.current = {
        pointerId: event.pointerId,
        originIndex: index,
        hoverIndex: index,
        startX: event.clientX,
        startY: event.clientY,
        startScroll: strip?.scrollLeft ?? 0,
        grabX: event.clientX - rect.left,
        size: rect.width,
        gap,
        dx: 0,
        active: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = sessionRef.current;
      const strip = stripRef.current;
      if (!session || session.pointerId !== event.pointerId || !strip) {
        return;
      }
      if (!session.active) {
        const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
        if (distance < DRAG_THRESHOLD_PX) {
          return;
        }
        session.active = true;
      }
      const stripRect = strip.getBoundingClientRect();
      if (event.clientX < stripRect.left + SCROLL_EDGE_PX) {
        strip.scrollLeft -= SCROLL_STEP_PX;
      } else if (event.clientX > stripRect.right - SCROLL_EDGE_PX) {
        strip.scrollLeft += SCROLL_STEP_PX;
      }
      session.dx = event.clientX - session.startX + (strip.scrollLeft - session.startScroll);
      session.hoverIndex = frameDragHoverIndex(
        itemContentLeft(event.clientX, session.grabX, strip),
        session.size + session.gap,
        count,
      );
      publish(session);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }
      endSession(session, session.active);
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }
      if (session.active) {
        suppressClickRef.current = true;
      }
      sessionRef.current = null;
      setDrag(null);
    },
    onClickCapture: (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (!suppressClickRef.current) {
        return;
      }
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  });

  return { drag, bindFrame };
}
