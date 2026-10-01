import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  clampRectIntersectingSheet,
  extractNativeRect,
  resizeDraftRect,
  type CropResizeHandle,
  type NativeCropRect,
} from "@/shared/store/editorCanvas";

type StoryboardSliceViewportProps = {
  native: Uint8ClampedArray;
  nativeWidth: number;
  nativeHeight: number;
  draftRect: NativeCropRect;
  onionRect: NativeCropRect | null;
  canResize: boolean;
  onDraftRect: (rect: NativeCropRect) => void;
};

type DragMode =
  | { kind: "pan"; startX: number; startY: number; panX: number; panY: number }
  | { kind: "move"; startX: number; startY: number; origin: NativeCropRect }
  | { kind: "resize"; handle: CropResizeHandle; startX: number; startY: number; origin: NativeCropRect };

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 64;
const HANDLE_SCREEN_PX = 12;
const HANDLE_IDS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

type SliceView = { zoom: number; x: number; y: number };

const RESIZE_CURSOR: Record<CropResizeHandle, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

/** Keep the pixel under the cursor fixed while the zoom changes. */
export function zoomSliceViewAtPoint(
  view: SliceView,
  anchorX: number,
  anchorY: number,
  nextZoom: number,
): SliceView {
  if (view.zoom === nextZoom || view.zoom === 0) {
    return view;
  }
  const ratio = nextZoom / view.zoom;
  return {
    zoom: nextZoom,
    x: anchorX - (anchorX - view.x) * ratio,
    y: anchorY - (anchorY - view.y) * ratio,
  };
}

export function StoryboardSliceViewport({
  native,
  nativeWidth,
  nativeHeight,
  draftRect,
  onionRect,
  canResize,
  onDraftRect,
}: StoryboardSliceViewportProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onionCanvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 16, y: 16 });
  const viewRef = useRef<SliceView>({ zoom: 1, x: 16, y: 16 });
  const dragRef = useRef<DragMode | null>(null);
  const spaceRef = useRef(false);

  const commitView = useCallback((next: SliceView) => {
    viewRef.current = next;
    setZoom(next.zoom);
    setPan({ x: next.x, y: next.y });
  }, []);

  const clientToNative = useCallback((clientX: number, clientY: number) => {
    const root = rootRef.current;
    if (!root) {
      return { x: 0, y: 0 };
    }
    const rect = root.getBoundingClientRect();
    const view = viewRef.current;
    const x = (clientX - rect.left - view.x) / view.zoom;
    const y = (clientY - rect.top - view.y) / view.zoom;
    return { x, y };
  }, []);

  const fitToView = useCallback(() => {
    const root = rootRef.current;
    if (!root || root.clientWidth <= 0 || root.clientHeight <= 0) {
      return;
    }
    const pad = 32;
    const fitZoom = Math.min(
      (root.clientWidth - pad * 2) / Math.max(1, nativeWidth),
      (root.clientHeight - pad * 2) / Math.max(1, nativeHeight),
    );
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fitZoom));
    commitView({
      zoom: nextZoom,
      x: (root.clientWidth - nativeWidth * nextZoom) / 2,
      y: (root.clientHeight - nativeHeight * nextZoom) / 2,
    });
  }, [commitView, nativeHeight, nativeWidth]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) {
        fitToView();
      }
    };
    run();
    const frame = requestAnimationFrame(run);
    const root = rootRef.current;
    let observer: ResizeObserver | null = null;
    if (root && typeof ResizeObserver !== "undefined") {
      let fittedOnce = false;
      observer = new ResizeObserver(() => {
        if (fittedOnce || cancelled || dragRef.current) {
          return;
        }
        if (root.clientWidth > 0 && root.clientHeight > 0) {
          fittedOnce = true;
          fitToView();
        }
      });
      observer.observe(root);
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [fitToView]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.width = nativeWidth;
    canvas.height = nativeHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const image = ctx.createImageData(nativeWidth, nativeHeight);
    image.data.set(native);
    ctx.putImageData(image, 0, 0);
  }, [native, nativeHeight, nativeWidth]);

  useEffect(() => {
    const canvas = onionCanvasRef.current;
    if (!canvas || !onionRect) {
      return;
    }
    const crop = extractNativeRect(native, nativeWidth, nativeHeight, onionRect);
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const image = ctx.createImageData(crop.width, crop.height);
    image.data.set(crop.pixels);
    ctx.putImageData(image, 0, 0);
  }, [native, nativeHeight, nativeWidth, onionRect]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spaceRef.current = true;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spaceRef.current = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.deltaY === 0) {
        return;
      }
      const rect = root.getBoundingClientRect();
      const current = viewRef.current;
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor));
      if (nextZoom === current.zoom) {
        return;
      }
      commitView(
        zoomSliceViewAtPoint(current, event.clientX - rect.left, event.clientY - rect.top, nextZoom),
      );
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [commitView]);

  const hitHandle = (nx: number, ny: number, rect: NativeCropRect): CropResizeHandle | null => {
    if (!canResize) {
      return null;
    }
    const edge = HANDLE_SCREEN_PX / zoom;
    const nearLeft = nx >= rect.x - edge && nx <= rect.x + edge;
    const nearRight = nx >= rect.x + rect.w - edge && nx <= rect.x + rect.w + edge;
    const nearTop = ny >= rect.y - edge && ny <= rect.y + edge;
    const nearBottom = ny >= rect.y + rect.h - edge && ny <= rect.y + rect.h + edge;
    const inX = nx >= rect.x - edge && nx <= rect.x + rect.w + edge;
    const inY = ny >= rect.y - edge && ny <= rect.y + rect.h + edge;

    if (nearLeft && nearTop) {
      return "nw";
    }
    if (nearRight && nearTop) {
      return "ne";
    }
    if (nearLeft && nearBottom) {
      return "sw";
    }
    if (nearRight && nearBottom) {
      return "se";
    }
    if (nearTop && inX) {
      return "n";
    }
    if (nearBottom && inX) {
      return "s";
    }
    if (nearLeft && inY) {
      return "w";
    }
    if (nearRight && inY) {
      return "e";
    }
    return null;
  };

  const insideRect = (nx: number, ny: number, rect: NativeCropRect) =>
    nx >= rect.x && nx <= rect.x + rect.w && ny >= rect.y && ny <= rect.y + rect.h;

  const syncCursor = (clientX: number, clientY: number) => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const drag = dragRef.current;
    if (drag?.kind === "pan") {
      root.style.cursor = "grabbing";
      return;
    }
    if (drag?.kind === "resize") {
      root.style.cursor = RESIZE_CURSOR[drag.handle];
      return;
    }
    if (drag?.kind === "move") {
      root.style.cursor = "move";
      return;
    }
    const point = clientToNative(clientX, clientY);
    const handle = hitHandle(point.x, point.y, draftRect);
    if (handle) {
      root.style.cursor = RESIZE_CURSOR[handle];
      return;
    }
    root.style.cursor = insideRect(point.x, point.y, draftRect) ? "move" : "grab";
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button === 1 || (event.button === 0 && spaceRef.current)) {
      dragRef.current = {
        kind: "pan",
        startX: event.clientX,
        startY: event.clientY,
        panX: viewRef.current.x,
        panY: viewRef.current.y,
      };
      syncCursor(event.clientX, event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const { x, y } = clientToNative(event.clientX, event.clientY);
    const handle = hitHandle(x, y, draftRect);
    if (handle) {
      dragRef.current = {
        kind: "resize",
        handle,
        startX: event.clientX,
        startY: event.clientY,
        origin: draftRect,
      };
    } else if (insideRect(x, y, draftRect)) {
      dragRef.current = {
        kind: "move",
        startX: event.clientX,
        startY: event.clientY,
        origin: draftRect,
      };
    } else {
      dragRef.current = {
        kind: "pan",
        startX: event.clientX,
        startY: event.clientY,
        panX: viewRef.current.x,
        panY: viewRef.current.y,
      };
    }
    syncCursor(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) {
      syncCursor(event.clientX, event.clientY);
      return;
    }
    if (drag.kind === "pan") {
      commitView({
        zoom: viewRef.current.zoom,
        x: drag.panX + (event.clientX - drag.startX),
        y: drag.panY + (event.clientY - drag.startY),
      });
      return;
    }
    const dx = (event.clientX - drag.startX) / viewRef.current.zoom;
    const dy = (event.clientY - drag.startY) / viewRef.current.zoom;
    if (drag.kind === "move") {
      onDraftRect(
        clampRectIntersectingSheet(
          { ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy },
          nativeWidth,
          nativeHeight,
        ),
      );
      return;
    }
    onDraftRect(
      clampRectIntersectingSheet(
        resizeDraftRect(drag.origin, drag.handle, dx, dy, event.shiftKey),
        nativeWidth,
        nativeHeight,
      ),
    );
  };

  const onPointerUp = (event: React.PointerEvent) => {
    dragRef.current = null;
    syncCursor(event.clientX, event.clientY);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onPointerLeave = () => {
    if (dragRef.current || !rootRef.current) {
      return;
    }
    rootRef.current.style.cursor = "grab";
  };

  const cropStyle: CSSProperties = {
    left: pan.x + draftRect.x * zoom,
    top: pan.y + draftRect.y * zoom,
    width: draftRect.w * zoom,
    height: draftRect.h * zoom,
  };

  const handleStyle = (handle: (typeof HANDLE_IDS)[number]): CSSProperties => {
    const left = pan.x + draftRect.x * zoom;
    const top = pan.y + draftRect.y * zoom;
    const width = draftRect.w * zoom;
    const height = draftRect.h * zoom;
    const half = HANDLE_SCREEN_PX / 2;
    const cx = left + width / 2;
    const cy = top + height / 2;
    const positions: Record<(typeof HANDLE_IDS)[number], { left: number; top: number }> = {
      nw: { left: left - half, top: top - half },
      n: { left: cx - half, top: top - half },
      ne: { left: left + width - half, top: top - half },
      e: { left: left + width - half, top: cy - half },
      se: { left: left + width - half, top: top + height - half },
      s: { left: cx - half, top: top + height - half },
      sw: { left: left - half, top: top + height - half },
      w: { left: left - half, top: cy - half },
    };
    const pos = positions[handle];
    return {
      left: pos.left,
      top: pos.top,
      width: HANDLE_SCREEN_PX,
      height: HANDLE_SCREEN_PX,
    };
  };

  return (
    <div
      ref={rootRef}
      className="storyboard-slice-viewport"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <canvas
        ref={canvasRef}
        className="storyboard-slice-viewport__sheet"
        style={{
          width: nativeWidth * zoom,
          height: nativeHeight * zoom,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      />
      <div className="storyboard-slice-viewport__crop" style={cropStyle}>
        {onionRect ? (
          <canvas ref={onionCanvasRef} className="storyboard-slice-viewport__onion-frame" />
        ) : null}
      </div>
      {canResize
        ? HANDLE_IDS.map((handle) => (
            <div
              key={handle}
              className={`storyboard-slice-viewport__handle storyboard-slice-viewport__handle--${handle}`}
              style={handleStyle(handle)}
              aria-hidden="true"
            />
          ))
        : null}
    </div>
  );
}
