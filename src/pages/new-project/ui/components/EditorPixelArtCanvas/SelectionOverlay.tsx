import { useMemo } from "react";
import {
  maskBBox,
  normalizeDraftRect,
  sampleFloatToCanvas,
  useEditorCanvasStore,
} from "@/shared/store/editorCanvas";
import { useEditorViewportStore } from "@/shared/store/editorViewport";
import "./SelectionOverlay.scss";

function maskContourPath(mask: Uint8Array, width: number, height: number, zoom: number): string {
  const parts: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]! === 0) continue;
      const left = x === 0 || mask[y * width + (x - 1)]! === 0;
      const right = x === width - 1 || mask[y * width + (x + 1)]! === 0;
      const top = y === 0 || mask[(y - 1) * width + x]! === 0;
      const bottom = y === height - 1 || mask[(y + 1) * width + x]! === 0;
      const x0 = x * zoom;
      const y0 = y * zoom;
      const x1 = (x + 1) * zoom;
      const y1 = (y + 1) * zoom;
      if (top) parts.push(`M${x0} ${y0}L${x1} ${y0}`);
      if (bottom) parts.push(`M${x0} ${y1}L${x1} ${y1}`);
      if (left) parts.push(`M${x0} ${y0}L${x0} ${y1}`);
      if (right) parts.push(`M${x1} ${y0}L${x1} ${y1}`);
    }
  }
  return parts.join("");
}

function handlePositions(
  x: number,
  y: number,
  w: number,
  h: number,
  zoom: number,
): Array<{ key: string; cx: number; cy: number }> {
  const x0 = x * zoom;
  const y0 = y * zoom;
  const x1 = (x + w) * zoom;
  const y1 = (y + h) * zoom;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  return [
    { key: "nw", cx: x0, cy: y0 },
    { key: "n", cx: mx, cy: y0 },
    { key: "ne", cx: x1, cy: y0 },
    { key: "e", cx: x1, cy: my },
    { key: "se", cx: x1, cy: y1 },
    { key: "s", cx: mx, cy: y1 },
    { key: "sw", cx: x0, cy: y1 },
    { key: "w", cx: x0, cy: my },
  ];
}

export function SelectionOverlay() {
  const revision = useEditorCanvasStore((s) => s.revision);
  const selectionMask = useEditorCanvasStore((s) => s.selectionMask);
  const selectionDraft = useEditorCanvasStore((s) => s.selectionDraft);
  const floatSession = useEditorCanvasStore((s) => s.floatSession);
  const width = useEditorCanvasStore((s) => s.width);
  const height = useEditorCanvasStore((s) => s.height);
  const zoom = useEditorViewportStore((s) => s.zoom);

  const antsPath = useMemo(() => {
    void revision;
    if (floatSession) {
      const sampled = sampleFloatToCanvas(
        floatSession.pixels,
        floatSession.mask,
        floatSession.width,
        floatSession.height,
        floatSession.transform,
        width,
        height,
      );
      return maskContourPath(sampled.mask, width, height, zoom);
    }
    if (!selectionMask) return "";
    return maskContourPath(selectionMask, width, height, zoom);
  }, [floatSession, height, revision, selectionMask, width, zoom]);

  const draftGeom = useMemo(() => {
    void revision;
    if (!selectionDraft) return null;
    if (selectionDraft.kind === "lasso") {
      if (selectionDraft.points.length < 1) return null;
      const pts = selectionDraft.points
        .map((p) => `${(p.x + 0.5) * zoom},${(p.y + 0.5) * zoom}`)
        .join(" ");
      return { kind: "lasso" as const, points: pts };
    }
    const nudgeDx = selectionDraft.nudgeDx ?? 0;
    const nudgeDy = selectionDraft.nudgeDy ?? 0;
    const constrained =
      selectionDraft.kind === "rect"
        ? selectionDraft.constrainSquare
        : selectionDraft.constrainCircle;
    const box = normalizeDraftRect(
      selectionDraft.x0 + nudgeDx,
      selectionDraft.y0 + nudgeDy,
      selectionDraft.x1 + nudgeDx,
      selectionDraft.y1 + nudgeDy,
      constrained,
    );
    const x = box.minX * zoom;
    const y = box.minY * zoom;
    const w = (box.maxX - box.minX + 1) * zoom;
    const h = (box.maxY - box.minY + 1) * zoom;
    return { kind: selectionDraft.kind, x, y, w, h };
  }, [revision, selectionDraft, zoom]);

  const bbox = useMemo(() => {
    void revision;
    if (floatSession) {
      const t = floatSession.transform;
      // Axis-aligned bbox of rotated float — approximate via sample mask.
      const sampled = sampleFloatToCanvas(
        floatSession.pixels,
        floatSession.mask,
        floatSession.width,
        floatSession.height,
        t,
        width,
        height,
      );
      return maskBBox(sampled.mask, width, height);
    }
    if (!selectionMask) return null;
    return maskBBox(selectionMask, width, height);
  }, [floatSession, height, revision, selectionMask, width]);

  const handles = bbox ? handlePositions(bbox.x, bbox.y, bbox.w, bbox.h, zoom) : [];

  const floatImage = useMemo(() => {
    void revision;
    if (!floatSession) return null;
    const sampled = sampleFloatToCanvas(
      floatSession.pixels,
      floatSession.mask,
      floatSession.width,
      floatSession.height,
      floatSession.transform,
      width,
      height,
    );
    // Tiny canvas → data URL for SVG image overlay.
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(sampled.pixels);
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  }, [floatSession, height, revision, width]);

  if (!selectionMask && !selectionDraft && !floatSession) {
    return null;
  }

  const stageW = width * zoom;
  const stageH = height * zoom;

  return (
    <svg
      className="selection-overlay"
      width={stageW}
      height={stageH}
      viewBox={`0 0 ${stageW} ${stageH}`}
      aria-hidden="true"
    >
      {floatImage ? (
        <image
          href={floatImage}
          x={0}
          y={0}
          width={stageW}
          height={stageH}
          style={{ imageRendering: "pixelated" }}
        />
      ) : null}

      {draftGeom?.kind === "rect" ? (
        <rect
          className="selection-overlay__draft"
          x={draftGeom.x}
          y={draftGeom.y}
          width={draftGeom.w}
          height={draftGeom.h}
        />
      ) : null}
      {draftGeom?.kind === "ellipse" ? (
        <ellipse
          className="selection-overlay__draft"
          cx={draftGeom.x + draftGeom.w / 2}
          cy={draftGeom.y + draftGeom.h / 2}
          rx={draftGeom.w / 2}
          ry={draftGeom.h / 2}
        />
      ) : null}
      {draftGeom?.kind === "lasso" ? (
        <polyline className="selection-overlay__draft" points={draftGeom.points} />
      ) : null}

      {antsPath ? <path className="selection-overlay__ants" d={antsPath} /> : null}

      {bbox && !selectionDraft
        ? handles.map((h) => (
            <rect
              key={h.key}
              className="selection-overlay__handle"
              x={h.cx - 4}
              y={h.cy - 4}
              width={8}
              height={8}
              data-handle={h.key}
            />
          ))
        : null}
    </svg>
  );
}
