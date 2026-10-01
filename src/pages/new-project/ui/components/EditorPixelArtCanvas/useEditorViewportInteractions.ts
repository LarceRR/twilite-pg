import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useEditorViewportStore, type ViewportPoint } from "@/shared/store/editorViewport";

type PanSession = {
  pointerId: number;
  clientX: number;
  clientY: number;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("input, textarea, select, button, a, [contenteditable='true']") !== null
  );
}

function pointInsideViewport(
  point: ViewportPoint | null,
  element: HTMLDivElement,
): point is ViewportPoint {
  return (
    point !== null &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x <= element.clientWidth &&
    point.y <= element.clientHeight
  );
}

function getViewportCenter(element: HTMLDivElement): ViewportPoint {
  return {
    x: element.clientWidth / 2,
    y: element.clientHeight / 2,
  };
}

export function useEditorViewportInteractions(
  viewportRef: RefObject<HTMLDivElement | null>,
  currentToolName: string,
) {
  const panSessionRef = useRef<PanSession | null>(null);
  const lastPointerRef = useRef<ViewportPoint | null>(null);
  const spacePressedRef = useRef(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const getKeyboardAnchor = useCallback((): ViewportPoint | null => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return null;
    }
    return pointInsideViewport(lastPointerRef.current, viewport)
      ? lastPointerRef.current
      : getViewportCenter(viewport);
  }, [viewportRef]);

  const zoomBy = useCallback(
    (delta: number) => {
      const anchor = getKeyboardAnchor();
      if (anchor) {
        useEditorViewportStore.getState().zoomBy(delta, anchor);
      }
    },
    [getKeyboardAnchor],
  );

  const zoomAtCenter = useCallback(
    (delta: number) => {
      const viewport = viewportRef.current;
      if (viewport) {
        useEditorViewportStore.getState().zoomBy(delta, getViewportCenter(viewport));
      }
    },
    [viewportRef],
  );

  const resetToFit = useCallback(() => {
    const viewport = viewportRef.current;
    const store = useEditorViewportStore.getState();
    if (viewport) {
      store.setViewportSize(viewport.clientWidth, viewport.clientHeight);
    }
    useEditorViewportStore.getState().resetToFit();
  }, [viewportRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (!(event.target instanceof Node) || !viewport.contains(event.target)) {
        return;
      }

      event.preventDefault();

      if (event.shiftKey) {
        const horizontalDelta =
          Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        useEditorViewportStore.getState().panBy(-horizontalDelta, 0);
        return;
      }

      if (event.deltaY === 0 && event.deltaX === 0) {
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      lastPointerRef.current = anchor;
      useEditorViewportStore
        .getState()
        .zoomBy(event.deltaY < 0 || event.deltaX < 0 ? 1 : -1, anchor);
    };

    // Capture on window so Ctrl/Mod+wheel is cancelled before Chromium applies
    // browser-page zoom. The target guard scopes the shortcut to this viewport.
    window.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
    return () => window.removeEventListener("wheel", handleWheel, true);
  }, [viewportRef]);

  useEffect(() => {
    const releaseSpace = () => {
      spacePressedRef.current = false;
      setIsSpacePressed(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInteractiveTarget(event.target)) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (!spacePressedRef.current) {
          spacePressedRef.current = true;
          setIsSpacePressed(true);
        }
        return;
      }

      if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") {
        event.preventDefault();
        zoomBy(1);
        return;
      }

      if (event.key === "-" || event.code === "NumpadSubtract") {
        event.preventDefault();
        zoomBy(-1);
        return;
      }

      if (event.key === "0" || event.code === "Numpad0") {
        event.preventDefault();
        resetToFit();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        releaseSpace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releaseSpace);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseSpace);
    };
  }, [resetToFit, zoomBy]);

  const handlePointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isInteractiveTarget(event.target)) {
        return;
      }

      const shouldPan =
        event.button === 1 ||
        (event.button === 0 && (spacePressedRef.current || currentToolName === "Move"));
      if (!shouldPan) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      panSessionRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsPanning(true);
    },
    [currentToolName],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    lastPointerRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const deltaX = event.clientX - session.clientX;
    const deltaY = event.clientY - session.clientY;
    session.clientX = event.clientX;
    session.clientY = event.clientY;
    useEditorViewportStore.getState().panBy(deltaX, deltaY);
  }, []);

  const endPan = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    panSessionRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleLostPointerCapture = useCallback((event: React.PointerEvent) => {
    if (panSessionRef.current?.pointerId === event.pointerId) {
      panSessionRef.current = null;
      setIsPanning(false);
    }
  }, []);

  return {
    isPanReady: currentToolName === "Move" || isSpacePressed,
    isPanning,
    handlePointerDownCapture,
    handlePointerMove,
    handlePointerUp: endPan,
    handlePointerCancel: endPan,
    handleLostPointerCapture,
    zoomIn: () => zoomAtCenter(1),
    zoomOut: () => zoomAtCenter(-1),
    resetToFit,
  };
}
