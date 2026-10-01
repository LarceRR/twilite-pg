import { Grid3X3, Maximize, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { cssCursor, cursorForToolName } from "@/shared/lib/editorCursors";
import { useEditorCanvasStore } from "@/shared/store/editorCanvas";
import { useEditorSelectedToolStore } from "@/shared/store/editorSelectedTool";
import {
  createPixelGridPath,
  GRID_MIN_ZOOM,
  MAX_VIEWPORT_ZOOM,
  MIN_VIEWPORT_ZOOM,
  useEditorViewportStore,
} from "@/shared/store/editorViewport";
import { useEditorViewportInteractions } from "./useEditorViewportInteractions";
import { usePixelCanvasPointer } from "./usePixelCanvasPointer";
import { SelectionOverlay } from "./SelectionOverlay";
import "./EditorPixelArtCanvas.scss";

export const EditorPixelArtCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onionPrevRef = useRef<HTMLCanvasElement | null>(null);
  const onionNextRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const revision = useEditorCanvasStore((state) => state.revision);
  const docWidth = useEditorCanvasStore((state) => state.width);
  const docHeight = useEditorCanvasStore((state) => state.height);
  const onionSkin = useEditorCanvasStore((state) => state.onionSkin);
  const activeFrameId = useEditorCanvasStore((state) => state.activeFrameId);
  const currentToolName = useEditorSelectedToolStore((state) => state.currentTool.name);
  const selectionTool = useEditorCanvasStore((state) => state.selectionTool);
  const zoom = useEditorViewportStore((state) => state.zoom);
  const panX = useEditorViewportStore((state) => state.panX);
  const panY = useEditorViewportStore((state) => state.panY);
  const showGrid = useEditorViewportStore((state) => state.showGrid);

  const syncCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const { getCompositePixels, width, height } = useEditorCanvasStore.getState();
    const pixels = getCompositePixels();
    // Copy into a fresh ImageData so the store buffer is never detached.
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
  }, []);

  useEffect(() => {
    syncCanvas();
  }, [revision, syncCanvas]);

  useEffect(() => {
    const paintOnion = (canvas: HTMLCanvasElement | null, pixels: Uint8ClampedArray | null) => {
      if (!canvas) {
        return;
      }
      const ctx = canvas.getContext("2d");
      if (
        !ctx ||
        typeof ctx.clearRect !== "function" ||
        typeof ctx.createImageData !== "function" ||
        typeof ctx.putImageData !== "function"
      ) {
        return;
      }
      const { width, height } = useEditorCanvasStore.getState();
      ctx.clearRect(0, 0, width, height);
      if (!pixels) {
        return;
      }
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    };

    const state = useEditorCanvasStore.getState();
    paintOnion(onionPrevRef.current, state.getNeighborComposite(-1));
    paintOnion(onionNextRef.current, state.getNeighborComposite(1));
  }, [activeFrameId, docHeight, docWidth, onionSkin, revision]);

  const pointer = usePixelCanvasPointer(syncCanvas);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.setProperty(
      "--editor-cursor",
      cssCursor(cursorForToolName(currentToolName, selectionTool)),
    );
  }, [currentToolName, selectionTool]);
  const viewport = useEditorViewportInteractions(viewportRef, currentToolName);
  const canvasWidth = docWidth * zoom;
  const canvasHeight = docHeight * zoom;
  const gridVisible = showGrid && zoom >= GRID_MIN_ZOOM;
  const gridPath = useMemo(
    () => (gridVisible ? createPixelGridPath({ width: docWidth, height: docHeight }, zoom) : ""),
    [docHeight, docWidth, gridVisible, zoom],
  );

  useEffect(() => {
    useEditorViewportStore.getState().setDocumentSize(docWidth, docHeight);
  }, [docHeight, docWidth]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      useEditorViewportStore.getState().setViewportSize(element.clientWidth, element.clientHeight);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={viewportRef}
      className={`editor-pixel-art-canvas${
        viewport.isPanReady ? " editor-pixel-art-canvas--pan-ready" : ""
      }${viewport.isPanning ? " editor-pixel-art-canvas--panning" : ""}`}
      aria-label="Область редактирования холста"
      onPointerDownCapture={viewport.handlePointerDownCapture}
      onPointerMove={viewport.handlePointerMove}
      onPointerUp={viewport.handlePointerUp}
      onPointerCancel={viewport.handlePointerCancel}
      onLostPointerCapture={viewport.handleLostPointerCapture}
    >
      <div
        className="editor-pixel-art-canvas__stage"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          transform: `translate3d(${panX}px, ${panY}px, 0)`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="editor-pixel-art-canvas__bitmap"
          width={docWidth}
          height={docHeight}
          onPointerDown={pointer.handlePointerDown}
          onPointerMove={pointer.handlePointerMove}
          onPointerUp={pointer.handlePointerUp}
          onPointerCancel={pointer.handlePointerCancel}
          onDoubleClick={pointer.handleDoubleClick}
          onContextMenu={pointer.handleContextMenu}
        />
        <canvas
          ref={onionPrevRef}
          className="editor-pixel-art-canvas__onion editor-pixel-art-canvas__onion--prev"
          width={docWidth}
          height={docHeight}
          aria-hidden="true"
        />
        <canvas
          ref={onionNextRef}
          className="editor-pixel-art-canvas__onion editor-pixel-art-canvas__onion--next"
          width={docWidth}
          height={docHeight}
          aria-hidden="true"
        />
        {gridVisible && (
          <svg
            className="editor-pixel-art-canvas__grid"
            width={canvasWidth}
            height={canvasHeight}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            aria-hidden="true"
          >
            <path d={gridPath} />
          </svg>
        )}
        <SelectionOverlay />
      </div>

      {pointer.fillStatus ? (
        <div className="editor-pixel-art-canvas__status" role="status">
          {pointer.fillStatus}
        </div>
      ) : null}

      <div className="editor-pixel-art-canvas__zoom-controls" aria-label="Управление масштабом">
        <button
          type="button"
          onClick={viewport.zoomOut}
          disabled={zoom <= MIN_VIEWPORT_ZOOM}
          title="Уменьшить масштаб (-)"
          aria-label="Уменьшить масштаб"
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <output aria-live="polite" title="Текущий масштаб">
          {zoom}×
        </output>
        <button
          type="button"
          onClick={viewport.zoomIn}
          disabled={zoom >= MAX_VIEWPORT_ZOOM}
          title="Увеличить масштаб (+)"
          aria-label="Увеличить масштаб"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={viewport.resetToFit}
          title="Вписать холст (0)"
          aria-label="Вписать холст"
        >
          <Maximize size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={showGrid ? "is-active" : undefined}
          onClick={() => useEditorViewportStore.getState().toggleGrid()}
          aria-pressed={showGrid}
          title={`Пиксельная сетка (видна с ${GRID_MIN_ZOOM}×)`}
          aria-label="Переключить пиксельную сетку"
        >
          <Grid3X3 size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
