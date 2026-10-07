import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useEditorCanvasStore } from "@/shared/store/editorCanvas";
import {
  getActiveBrushShape,
  getToolSoftness,
  useEditorSelectedToolStore,
} from "@/shared/store/editorSelectedTool";
import { clientPointToDocumentPixel, useEditorViewportStore } from "@/shared/store/editorViewport";
import {
  affectModeForTool,
  affectZoneBounds,
  affectZonePaths,
  paintToolAffectZone,
} from "./toolAffectZone";
import "./ToolHoverZone.scss";

type HoverPixel = { x: number; y: number };

export function ToolHoverZone({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  const [hover, setHover] = useState<HoverPixel | null>(null);
  const maskRef = useRef<Uint8Array>(new Uint8Array(0));
  const zoom = useEditorViewportStore((state) => state.zoom);
  const docWidth = useEditorCanvasStore((state) => state.width);
  const docHeight = useEditorCanvasStore((state) => state.height);
  const revision = useEditorCanvasStore((state) => state.revision);
  const activeLayerId = useEditorCanvasStore((state) => state.activeLayerId);
  const selectionMask = useEditorCanvasStore((state) => state.selectionMask);
  const toolName = useEditorSelectedToolStore((state) => state.currentTool.name);
  const brushShape = useEditorSelectedToolStore((state) => getActiveBrushShape(state));
  const size = useEditorSelectedToolStore((state) => toolAmount(state.currentTool, "Size"));
  const softness = useEditorSelectedToolStore((state) => getToolSoftness(state));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      const point = clientPointToDocumentPixel(
        event.clientX,
        event.clientY,
        canvas.getBoundingClientRect(),
        { width: canvas.width, height: canvas.height },
      );
      setHover((prev) => {
        if (!point) {
          return prev === null ? prev : null;
        }
        if (prev && prev.x === point.x && prev.y === point.y) {
          return prev;
        }
        return point;
      });
    };
    const onLeave = () => setHover(null);

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [canvasRef, docWidth, docHeight]);

  const zone = useMemo(() => {
    if (!hover) {
      return null;
    }
    const canvas = useEditorCanvasStore.getState();
    const layer = canvas.layers.find((item) => item.id === canvas.activeLayerId);
    if (!layer) {
      return null;
    }
    const needed = docWidth * docHeight;
    if (maskRef.current.length !== needed) {
      maskRef.current = new Uint8Array(needed);
    }
    const mode = affectModeForTool(toolName, brushShape, size, softness);
    const count = paintToolAffectZone(maskRef.current, {
      mode,
      x: hover.x,
      y: hover.y,
      width: docWidth,
      height: docHeight,
      pixels: layer.pixels,
      selectionMask,
    });
    if (count <= 0) {
      return null;
    }
    const bounds = affectZoneBounds(maskRef.current, docWidth, docHeight);
    if (!bounds) {
      return null;
    }
    const paths = affectZonePaths(maskRef.current, docWidth, docHeight, zoom, count);
    return { count, bounds, paths };
  }, [
    activeLayerId,
    brushShape,
    docHeight,
    docWidth,
    hover,
    revision,
    selectionMask,
    size,
    softness,
    toolName,
    zoom,
  ]);

  if (!zone || !zone.paths.outline) {
    return null;
  }

  const screenWidth = docWidth * zoom;
  const screenHeight = docHeight * zoom;

  return (
    <svg
      className="tool-hover-zone"
      data-testid="tool-hover-zone"
      data-cell-count={zone.count}
      data-origin-x={zone.bounds.minX}
      data-origin-y={zone.bounds.minY}
      data-span-x={zone.bounds.maxX - zone.bounds.minX + 1}
      data-span-y={zone.bounds.maxY - zone.bounds.minY + 1}
      width={screenWidth}
      height={screenHeight}
      viewBox={`0 0 ${screenWidth} ${screenHeight}`}
      aria-hidden="true"
    >
      {zone.paths.fill ? <path className="tool-hover-zone__fill" d={zone.paths.fill} /> : null}
      <path className="tool-hover-zone__shadow" d={zone.paths.outline} />
      <path className="tool-hover-zone__line" d={zone.paths.outline} />
    </svg>
  );
}

function toolAmount(
  tool: { toolProperties?: ReadonlyArray<{ toolName: string; toolCurrentAmount: number }> },
  name: string,
): number {
  return (
    tool.toolProperties?.find((property) => property.toolName === name)?.toolCurrentAmount ?? 1
  );
}
