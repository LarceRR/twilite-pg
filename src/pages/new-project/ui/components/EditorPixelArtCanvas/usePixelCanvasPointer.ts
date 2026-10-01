import { useCallback, useEffect, useRef, useState } from "react";
import { cssCursor, cursorForToolName } from "@/shared/lib/editorCursors";
import {
  hexToRgba,
  snapLineEndpoint,
  TRANSPARENT_RGBA,
  useEditorCanvasStore,
  type BrushShape,
  type PixelPoint,
  type Rgba,
} from "@/shared/store/editorCanvas";
import { useEditorPaletteStore } from "@/shared/store/editorPalette";
import {
  getActiveBrushShape,
  getActiveShapeToolShape,
  getToolSoftness,
  useEditorSelectedToolStore,
} from "@/shared/store/editorSelectedTool";
import {
  clientPointToDocumentPixel,
  clientPointToDocumentPixelClamped,
} from "@/shared/store/editorViewport";
import { resolveSelectionHoverCursor, useSelectionPointer } from "./useSelectionPointer";

type PaintMode = "primary" | "secondary" | "erase";

type LineDraft = {
  start: PixelPoint;
  last: PixelPoint;
  shiftKey: boolean;
};

const LINE_TIP_SHAPE: BrushShape = "circle";

function clientToPixel(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): { x: number; y: number } | null {
  return clientPointToDocumentPixel(clientX, clientY, canvas.getBoundingClientRect(), {
    width: canvas.width,
    height: canvas.height,
  });
}

function clientToPixelClamped(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): PixelPoint | null {
  return clientPointToDocumentPixelClamped(clientX, clientY, canvas.getBoundingClientRect(), {
    width: canvas.width,
    height: canvas.height,
  });
}

function clampToCanvas(point: PixelPoint, width: number, height: number): PixelPoint {
  return {
    x: Math.min(width - 1, Math.max(0, point.x)),
    y: Math.min(height - 1, Math.max(0, point.y)),
  };
}

function resolvePaintMode(button: number, toolName: string): PaintMode | null {
  if (toolName === "Move" || toolName === "Crop" || toolName === "Palette" || toolName === "Select") {
    return null;
  }

  if (toolName === "Eraser") {
    return "erase";
  }

  if (button === 2) {
    return "secondary";
  }

  if (button === 0) {
    return "primary";
  }

  return null;
}

function resolveBrushSize(toolName: string, sizeProperty: number | undefined): number {
  if (toolName === "Pen") {
    return 1;
  }
  return Math.max(1, Math.floor(sizeProperty ?? 1));
}

function resolveRgba(mode: PaintMode, primaryColor: string, secondaryColor: string): Rgba {
  if (mode === "erase") {
    return TRANSPARENT_RGBA;
  }
  return hexToRgba(mode === "secondary" ? secondaryColor : primaryColor);
}

function getCoalescedPointerEvents(event: React.PointerEvent<HTMLCanvasElement>): PointerEvent[] {
  const native = event.nativeEvent;
  if (typeof native.getCoalescedEvents === "function") {
    const coalesced = native.getCoalescedEvents();
    if (coalesced.length > 0) {
      return coalesced;
    }
  }
  return [native];
}

export function usePixelCanvasPointer(onPainted: () => void) {
  const strokeRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const lineDraftRef = useRef<LineDraft | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokeColorRef = useRef<string | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const [fillStatus, setFillStatus] = useState<string | null>(null);
  const selection = useSelectionPointer(onPainted);

  const showFillStatus = useCallback((message: string) => {
    setFillStatus(message);
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = window.setTimeout(() => {
      setFillStatus(null);
      statusTimerRef.current = null;
    }, 2500);
  }, []);

  const rememberStrokeColor = useCallback((mode: PaintMode, primary: string, secondary: string) => {
    strokeColorRef.current = mode === "erase" ? null : mode === "secondary" ? secondary : primary;
  }, []);

  const commitStrokeColor = useCallback(() => {
    const hex = strokeColorRef.current;
    strokeColorRef.current = null;
    if (hex) {
      useEditorPaletteStore.getState().addColor(hex, "canvas");
    }
  }, []);

  const flushPaint = useCallback(() => {
    onPainted();
  }, [onPainted]);

  const cancelLineDraft = useCallback(() => {
    if (!lineDraftRef.current) {
      return;
    }

    lineDraftRef.current = null;
    strokeColorRef.current = null;
    useEditorCanvasStore.getState().cancelStroke();
    flushPaint();
  }, [flushPaint]);

  const updateLinePreview = useCallback(
    (point: PixelPoint, shiftKey: boolean) => {
      const draft = lineDraftRef.current;
      if (!draft) {
        return;
      }

      draft.last = point;
      draft.shiftKey = shiftKey;

      const state = useEditorCanvasStore.getState();
      const rawEnd = shiftKey ? snapLineEndpoint(draft.start, point) : point;
      const end = clampToCanvas(rawEnd, state.width, state.height);
      state.previewStrokeSegment(draft.start.x, draft.start.y, end.x, end.y);
      flushPaint();
    },
    [flushPaint],
  );

  useEffect(() => {
    const handleWindowPointerMove = (event: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!lineDraftRef.current || !canvas) {
        return;
      }

      const point = clientToPixelClamped(event.clientX, event.clientY, canvas);
      if (point) {
        updateLinePreview(point, event.shiftKey);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const draft = lineDraftRef.current;
      if (!draft) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancelLineDraft();
      } else if (event.key === "Shift" && !draft.shiftKey) {
        updateLinePreview(draft.last, true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const draft = lineDraftRef.current;
      if (event.key === "Shift" && draft?.shiftKey) {
        updateLinePreview(draft.last, false);
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [cancelLineDraft, updateLinePreview]);

  useEffect(() => {
    return useEditorSelectedToolStore.subscribe((state) => {
      const lineModeStillSelected =
        state.currentTool.name === "Shapes" && state.shapeToolShape === "line";
      if (lineDraftRef.current && !lineModeStillSelected) {
        cancelLineDraft();
      }
    });
  }, [cancelLineDraft]);

  useEffect(
    () => () => {
      if (lineDraftRef.current) {
        lineDraftRef.current = null;
        strokeColorRef.current = null;
        useEditorCanvasStore.getState().cancelStroke();
      }
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = event.currentTarget;
      canvasRef.current = canvas;
      const toolState = useEditorSelectedToolStore.getState();
      const tool = toolState.currentTool;

      if (tool.name === "Select") {
        selection.handleSelectionPointerDown(event);
        return;
      }

      const mode = resolvePaintMode(event.button, tool.name);
      if (!mode) {
        return;
      }

      event.preventDefault();

      const point = clientToPixel(event.clientX, event.clientY, canvas);
      if (!point) {
        return;
      }

      const selectedBrushShape = getActiveBrushShape(toolState);
      const selectedShapeToolShape = getActiveShapeToolShape(toolState);
      const sizeProperty = tool.toolProperties?.find(
        (p) => p.toolName === "Size",
      )?.toolCurrentAmount;
      const size = resolveBrushSize(tool.name, sizeProperty);
      const softness = tool.name === "Pen" ? 0 : getToolSoftness(toolState);
      const canvasState = useEditorCanvasStore.getState();
      const { primaryColor, secondaryColor } = canvasState;
      const rgba = resolveRgba(mode, primaryColor, secondaryColor);

      if (tool.name === "Fill") {
        const result = canvasState.fillAt(point.x, point.y, rgba);
        if (!result.ok) {
          showFillStatus(result.reason);
          return;
        }
        if (result.filledPixels > 0) {
          useEditorPaletteStore
            .getState()
            .addColor(mode === "secondary" ? secondaryColor : primaryColor, "canvas");
          flushPaint();
        }
        return;
      }

      if (tool.name === "Shapes" && selectedShapeToolShape === "line") {
        if (lineDraftRef.current) {
          updateLinePreview(point, event.shiftKey);
          lineDraftRef.current = null;
          commitStrokeColor();
          useEditorCanvasStore.getState().endStroke();
          return;
        }

        if (
          !canvasState.beginStroke({
            rgba,
            size,
            shape: LINE_TIP_SHAPE,
            softness,
            mode: "paint",
          })
        ) {
          return;
        }

        rememberStrokeColor(mode, primaryColor, secondaryColor);
        lineDraftRef.current = {
          start: point,
          last: point,
          shiftKey: event.shiftKey,
        };
        canvasState.previewStrokeSegment(point.x, point.y, point.x, point.y);
        flushPaint();
        return;
      }

      // Future geometric shapes must opt into their own interaction logic.
      if (tool.name === "Shapes") {
        return;
      }

      canvas.setPointerCapture(event.pointerId);
      const shape: BrushShape = tool.name === "Pen" ? "square" : selectedBrushShape;

      if (
        !canvasState.beginStroke({
          rgba,
          size,
          shape,
          softness,
          mode: mode === "erase" ? "erase" : "paint",
        })
      ) {
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
        return;
      }

      rememberStrokeColor(mode, primaryColor, secondaryColor);
      canvasState.paintAt(point.x, point.y);
      strokeRef.current = {
        pointerId: event.pointerId,
        lastX: point.x,
        lastY: point.y,
      };
      flushPaint();
    },
    [
      commitStrokeColor,
      flushPaint,
      rememberStrokeColor,
      selection,
      showFillStatus,
      updateLinePreview,
    ],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = event.currentTarget;
      const toolName = useEditorSelectedToolStore.getState().currentTool.name;
      const selectionTool = useEditorCanvasStore.getState().selectionTool;
      const hover =
        toolName === "Select"
          ? resolveSelectionHoverCursor(event.clientX, event.clientY, canvas)
          : null;
      canvas.style.setProperty(
        "--editor-cursor",
        cssCursor(hover ?? cursorForToolName(toolName, selectionTool)),
      );

      if (selection.handleSelectionPointerMove(event)) {
        return;
      }

      const stroke = strokeRef.current;
      if (!stroke || stroke.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      const { paintSegment } = useEditorCanvasStore.getState();
      let changed = false;

      for (const sample of getCoalescedPointerEvents(event)) {
        const point = clientToPixel(sample.clientX, sample.clientY, canvas);
        if (!point) {
          continue;
        }
        if (point.x === stroke.lastX && point.y === stroke.lastY) {
          continue;
        }
        if (paintSegment(stroke.lastX, stroke.lastY, point.x, point.y)) {
          changed = true;
        }
        stroke.lastX = point.x;
        stroke.lastY = point.y;
      }

      if (changed) {
        flushPaint();
      }
    },
    [flushPaint, selection],
  );

  const endStroke = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (selection.handleSelectionPointerUp(event)) {
        return;
      }
      const stroke = strokeRef.current;
      if (!stroke || stroke.pointerId !== event.pointerId) {
        return;
      }
      strokeRef.current = null;
      commitStrokeColor();
      useEditorCanvasStore.getState().endStroke();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [commitStrokeColor, selection],
  );

  const cancelPointer = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (selection.handleSelectionPointerCancel(event)) {
        return;
      }
      endStroke(event);
    },
    [endStroke, selection],
  );

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
  }, []);

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (useEditorSelectedToolStore.getState().currentTool.name !== "Select") {
        return;
      }
      const state = useEditorCanvasStore.getState();
      if (!state.floatSession) return;
      event.preventDefault();
      state.commitFloat();
      onPainted();
    },
    [onPainted],
  );

  // Auto-commit float on any tool switch.
  useEffect(() => {
    let prevName = useEditorSelectedToolStore.getState().currentTool.name;
    return useEditorSelectedToolStore.subscribe((state) => {
      if (state.currentTool.name === prevName) return;
      prevName = state.currentTool.name;
      const canvas = useEditorCanvasStore.getState();
      if (canvas.floatSession) {
        canvas.commitFloat();
        onPainted();
      }
    });
  }, [onPainted]);

  return {
    fillStatus,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: endStroke,
    handlePointerCancel: cancelPointer,
    handleContextMenu,
    handleDoubleClick,
  };
}
