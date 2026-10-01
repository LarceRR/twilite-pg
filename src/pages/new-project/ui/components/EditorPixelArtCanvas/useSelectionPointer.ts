import { useCallback, useEffect, useRef } from "react";
import {
  maskBBox,
  maskHitTest,
  resolveSelectionStroke,
  snapRotationDegrees,
  useEditorCanvasStore,
  type FloatTransform,
  type PixelPoint,
  type SelectionDraft,
} from "@/shared/store/editorCanvas";
import {
  clientPointToDocumentPixel,
  clientPointToDocumentPixelClamped,
} from "@/shared/store/editorViewport";
import {
  cursorForScaleHandle,
  type EditorCursorId,
} from "@/shared/lib/editorCursors";

type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type SelectionGesture =
  | {
      kind: "draft";
      pointerId: number;
      tool: "rect" | "ellipse" | "lasso";
      spaceHeld: boolean;
      lastClientX: number;
      lastClientY: number;
    }
  | {
      kind: "move";
      pointerId: number;
      startDoc: PixelPoint;
      startTransform: FloatTransform;
      started: boolean;
    }
  | {
      kind: "scale";
      pointerId: number;
      handle: HandleId;
      startDoc: PixelPoint;
      startTransform: FloatTransform;
      started: boolean;
      aspect: number;
    }
  | {
      kind: "rotate";
      pointerId: number;
      startAngle: number;
      startRotation: number;
      center: PixelPoint;
      started: boolean;
    };

function clientToPixel(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): PixelPoint | null {
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

function hitHandle(
  bbox: { x: number; y: number; w: number; h: number },
  docX: number,
  docY: number,
  zoom: number,
): HandleId | null {
  const hitPad = Math.max(0.6, 6 / zoom);
  const points: Array<{ id: HandleId; x: number; y: number }> = [
    { id: "nw", x: bbox.x, y: bbox.y },
    { id: "n", x: bbox.x + bbox.w / 2, y: bbox.y },
    { id: "ne", x: bbox.x + bbox.w, y: bbox.y },
    { id: "e", x: bbox.x + bbox.w, y: bbox.y + bbox.h / 2 },
    { id: "se", x: bbox.x + bbox.w, y: bbox.y + bbox.h },
    { id: "s", x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h },
    { id: "sw", x: bbox.x, y: bbox.y + bbox.h },
    { id: "w", x: bbox.x, y: bbox.y + bbox.h / 2 },
  ];
  for (const p of points) {
    if (Math.abs(docX - p.x) <= hitPad && Math.abs(docY - p.y) <= hitPad) {
      return p.id;
    }
  }
  return null;
}

function hitRotateZone(
  bbox: { x: number; y: number; w: number; h: number },
  docX: number,
  docY: number,
  zoom: number,
): boolean {
  const pad = Math.max(1.2, 14 / zoom);
  const corners = [
    { x: bbox.x, y: bbox.y },
    { x: bbox.x + bbox.w, y: bbox.y },
    { x: bbox.x + bbox.w, y: bbox.y + bbox.h },
    { x: bbox.x, y: bbox.y + bbox.h },
  ];
  for (const c of corners) {
    const dx = docX - c.x;
    const dy = docY - c.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4 / zoom && dist < pad) {
      // Outside the box, near corner.
      const insideX = docX >= bbox.x && docX <= bbox.x + bbox.w;
      const insideY = docY >= bbox.y && docY <= bbox.y + bbox.h;
      if (!(insideX && insideY)) return true;
    }
  }
  return false;
}

/** Cursor for the pixel under the pointer while Select is active. */
export function resolveSelectionHoverCursor(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): EditorCursorId | null {
  const state = useEditorCanvasStore.getState();
  const point = clientToPixel(clientX, clientY, canvas);
  if (!point) return null;

  const zoom = canvas.getBoundingClientRect().width / Math.max(1, canvas.width);
  const docX = point.x + 0.5;
  const docY = point.y + 0.5;

  let bbox: { x: number; y: number; w: number; h: number } | null = null;
  if (state.floatSession && Math.abs(state.floatSession.transform.rotation) < 1e-6) {
    const t = state.floatSession.transform;
    bbox = { x: t.x, y: t.y, w: t.w, h: t.h };
  } else if (state.selectionMask) {
    bbox = maskBBox(state.selectionMask, state.width, state.height);
  } else if (state.floatSession) {
    const t = state.floatSession.transform;
    bbox = { x: t.x, y: t.y, w: t.w, h: t.h };
  }
  if (!bbox) return null;

  if (hitRotateZone(bbox, docX, docY, zoom)) return "rotate";
  const handle = hitHandle(bbox, docX, docY, zoom);
  if (handle) return cursorForScaleHandle(handle);

  const insideMask = state.selectionMask
    ? maskHitTest(state.selectionMask, state.width, state.height, point.x, point.y)
    : false;
  const insideFloat =
    state.floatSession != null &&
    point.x >= bbox.x &&
    point.x < bbox.x + bbox.w &&
    point.y >= bbox.y &&
    point.y < bbox.y + bbox.h;
  if (insideMask || insideFloat) return "move";
  return null;
}

function scaleFromHandle(
  handle: HandleId,
  start: FloatTransform,
  doc: PixelPoint,
  startDoc: PixelPoint,
  lockAspect: boolean,
  fromCenter: boolean,
  aspect: number,
): FloatTransform {
  const dx = doc.x - startDoc.x;
  const dy = doc.y - startDoc.y;
  const cx = start.x + start.w / 2;
  const cy = start.y + start.h / 2;
  let { x, y, w, h, rotation } = start;

  if (fromCenter) {
    // Figma Alt/Option: opposite edge mirrors, size changes by 2× the drag.
    if (handle.includes("e")) w = Math.max(1, start.w + dx * 2);
    if (handle.includes("w")) w = Math.max(1, start.w - dx * 2);
    if (handle.includes("s")) h = Math.max(1, start.h + dy * 2);
    if (handle.includes("n")) h = Math.max(1, start.h - dy * 2);
    if (!handle.includes("e") && !handle.includes("w")) w = start.w;
    if (!handle.includes("n") && !handle.includes("s")) h = start.h;
  } else {
    if (handle.includes("e")) w = Math.max(1, start.w + dx);
    if (handle.includes("s")) h = Math.max(1, start.h + dy);
    if (handle.includes("w")) {
      w = Math.max(1, start.w - dx);
      x = start.x + (start.w - w);
    }
    if (handle.includes("n")) {
      h = Math.max(1, start.h - dy);
      y = start.y + (start.h - h);
    }
  }

  if (lockAspect && aspect > 0) {
    const corner = handle.length === 2;
    if (handle === "n" || handle === "s" || (corner && Math.abs(dy) >= Math.abs(dx))) {
      w = Math.max(1, h * aspect);
    } else {
      h = Math.max(1, w / aspect);
    }
  }

  if (fromCenter) {
    x = cx - w / 2;
    y = cy - h / 2;
  } else if (lockAspect) {
    if (handle.includes("n")) y = start.y + start.h - h;
    if (handle.includes("w")) x = start.x + start.w - w;
    if (handle === "n" || handle === "s") x = start.x + (start.w - w) / 2;
    if (handle === "e" || handle === "w") y = start.y + (start.h - h) / 2;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.max(1, Math.round(w)),
    h: Math.max(1, Math.round(h)),
    rotation,
  };
}

/**
 * Select-tool pointer gestures: draft marquee/lasso, float move/scale/rotate.
 * Returns true when the event was handled (caller should skip paint).
 */
export function useSelectionPointer(onChanged: () => void) {
  const gestureRef = useRef<SelectionGesture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ensureFloat = useCallback(() => {
    const state = useEditorCanvasStore.getState();
    if (state.floatSession) return true;
    return state.startFloatFromSelection();
  }, []);

  const handleSelectionPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      if (event.button !== 0) return false;
      const toolState = useEditorCanvasStore.getState();
      // Caller checks Select tool; this still guards playback.
      if (toolState.isPlaying) return true;

      const canvas = event.currentTarget;
      canvasRef.current = canvas;
      const point = clientToPixel(event.clientX, event.clientY, canvas);
      if (!point) return true;

      const selectionTool = toolState.selectionTool;
      if (selectionTool === "wand") {
        // Runtime deferred — absorb click so paint doesn't start.
        return true;
      }

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);

      // Floating interactions first.
      if (toolState.floatSession) {
        const session = toolState.floatSession;
        const sampledBBox = maskBBox(
          // Approximate with transform AABB (unrotated) for handles.
          (() => {
            const m = new Uint8Array(toolState.width * toolState.height);
            // Use transform rect as proxy when rotation is 0; otherwise full sample is heavy on down.
            if (Math.abs(session.transform.rotation) < 1e-6) {
              const { x, y, w, h } = session.transform;
              for (let ly = 0; ly < h; ly++) {
                for (let lx = 0; lx < w; lx++) {
                  const dx = x + lx;
                  const dy = y + ly;
                  if (dx < 0 || dy < 0 || dx >= toolState.width || dy >= toolState.height) continue;
                  const si = ly * session.width + lx;
                  // Map roughly — for rotate≠0 fall through to inside-hit via sample later.
                  if (lx < session.width && ly < session.height && session.mask[si]) {
                    m[dy * toolState.width + dx] = 1;
                  }
                }
              }
            }
            return m;
          })(),
          toolState.width,
          toolState.height,
        );

        const bbox =
          sampledBBox ??
          ({
            x: session.transform.x,
            y: session.transform.y,
            w: session.transform.w,
            h: session.transform.h,
          } as const);

        const zoom =
          canvas.getBoundingClientRect().width / Math.max(1, canvas.width);

        if (hitRotateZone(bbox, point.x + 0.5, point.y + 0.5, zoom)) {
          const center = {
            x: bbox.x + bbox.w / 2,
            y: bbox.y + bbox.h / 2,
          };
          gestureRef.current = {
            kind: "rotate",
            pointerId: event.pointerId,
            startAngle: Math.atan2(point.y + 0.5 - center.y, point.x + 0.5 - center.x),
            startRotation: session.transform.rotation,
            center,
            started: false,
          };
          return true;
        }

        const handle = hitHandle(bbox, point.x + 0.5, point.y + 0.5, zoom);
        if (handle) {
          gestureRef.current = {
            kind: "scale",
            pointerId: event.pointerId,
            handle,
            startDoc: point,
            startTransform: { ...session.transform },
            started: false,
            aspect: session.transform.w / Math.max(1, session.transform.h),
          };
          return true;
        }

        // Inside float AABB → move (spec: inside mask; AABB ok for unrotated).
        const inside =
          point.x >= bbox.x &&
          point.x < bbox.x + bbox.w &&
          point.y >= bbox.y &&
          point.y < bbox.y + bbox.h;
        if (inside) {
          gestureRef.current = {
            kind: "move",
            pointerId: event.pointerId,
            startDoc: point,
            startTransform: { ...session.transform },
            started: false,
          };
          return true;
        }

        // Outside float → commit.
        toolState.commitFloat();
        onChanged();
        return true;
      }

      // HasMask hit-testing.
      if (toolState.selectionMask) {
        const bbox = maskBBox(toolState.selectionMask, toolState.width, toolState.height);
        const zoom =
          canvas.getBoundingClientRect().width / Math.max(1, canvas.width);

        if (bbox) {
          if (hitRotateZone(bbox, point.x + 0.5, point.y + 0.5, zoom)) {
            if (!ensureFloat()) return true;
            const session = useEditorCanvasStore.getState().floatSession!;
            const center = {
              x: bbox.x + bbox.w / 2,
              y: bbox.y + bbox.h / 2,
            };
            gestureRef.current = {
              kind: "rotate",
              pointerId: event.pointerId,
              startAngle: Math.atan2(point.y + 0.5 - center.y, point.x + 0.5 - center.x),
              startRotation: session.transform.rotation,
              center,
              started: true,
            };
            onChanged();
            return true;
          }

          const handle = hitHandle(bbox, point.x + 0.5, point.y + 0.5, zoom);
          if (handle) {
            if (!ensureFloat()) return true;
            const session = useEditorCanvasStore.getState().floatSession!;
            gestureRef.current = {
              kind: "scale",
              pointerId: event.pointerId,
              handle,
              startDoc: point,
              startTransform: { ...session.transform },
              started: true,
              aspect: session.transform.w / Math.max(1, session.transform.h),
            };
            onChanged();
            return true;
          }
        }

        if (maskHitTest(toolState.selectionMask, toolState.width, toolState.height, point.x, point.y)) {
          if (!ensureFloat()) return true;
          const session = useEditorCanvasStore.getState().floatSession!;
          gestureRef.current = {
            kind: "move",
            pointerId: event.pointerId,
            startDoc: point,
            startTransform: { ...session.transform },
            started: true,
          };
          onChanged();
          return true;
        }

        // Outside mask + Replace + no Add/Subtract modifiers → deselect.
        const { effective } = resolveSelectionStroke(
          toolState.selectionOpMode,
          true,
          { shift: event.shiftKey, alt: event.altKey },
        );
        if (effective === "replace" && !event.shiftKey && !event.altKey) {
          toolState.deselect();
          onChanged();
          if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
          return true;
        }
      }

      // Begin draft.
      const hasMask = toolState.selectionMask != null;
      const { effective, constrainSquareOrCircle } = resolveSelectionStroke(
        toolState.selectionOpMode,
        hasMask,
        { shift: event.shiftKey, alt: event.altKey },
      );

      let draft: SelectionDraft;
      if (selectionTool === "lasso") {
        draft = {
          kind: "lasso",
          points: [{ x: point.x, y: point.y }],
          opMode: effective,
        };
      } else if (selectionTool === "ellipse") {
        draft = {
          kind: "ellipse",
          x0: point.x,
          y0: point.y,
          x1: point.x,
          y1: point.y,
          constrainCircle: constrainSquareOrCircle,
          opMode: effective,
        };
      } else {
        draft = {
          kind: "rect",
          x0: point.x,
          y0: point.y,
          x1: point.x,
          y1: point.y,
          constrainSquare: constrainSquareOrCircle,
          opMode: effective,
        };
      }

      toolState.beginSelectionDraft(draft);
      gestureRef.current = {
        kind: "draft",
        pointerId: event.pointerId,
        tool: selectionTool,
        spaceHeld: false,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      };
      onChanged();
      return true;
    },
    [ensureFloat, onChanged],
  );

  const handleSelectionPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return false;
      const canvas = event.currentTarget;
      const state = useEditorCanvasStore.getState();

      if (gesture.kind === "draft") {
        const draft = state.selectionDraft;
        if (!draft) return true;

        if (gesture.spaceHeld && (draft.kind === "rect" || draft.kind === "ellipse")) {
          const zoom = canvas.getBoundingClientRect().width / Math.max(1, canvas.width);
          const dx = Math.round((event.clientX - gesture.lastClientX) / zoom);
          const dy = Math.round((event.clientY - gesture.lastClientY) / zoom);
          if (dx || dy) {
            state.updateSelectionDraft({
              kind: draft.kind,
              nudgeDx: (draft.nudgeDx ?? 0) + dx,
              nudgeDy: (draft.nudgeDy ?? 0) + dy,
            });
            onChanged();
          }
          gesture.lastClientX = event.clientX;
          gesture.lastClientY = event.clientY;
          return true;
        }

        const point = clientToPixelClamped(event.clientX, event.clientY, canvas);
        if (!point) return true;

        if (draft.kind === "lasso") {
          const last = draft.points[draft.points.length - 1];
          if (!last || last.x !== point.x || last.y !== point.y) {
            state.updateSelectionDraft({
              kind: "lasso",
              points: [...draft.points, point],
            });
            onChanged();
          }
          return true;
        }

        const hasMask = state.selectionMask != null;
        const { constrainSquareOrCircle } = resolveSelectionStroke(
          state.selectionOpMode,
          hasMask,
          { shift: event.shiftKey, alt: event.altKey },
        );
        // Geometry constrain tracks live Shift; boolean stays latched.
        if (draft.kind === "rect") {
          state.updateSelectionDraft({
            kind: "rect",
            x1: point.x,
            y1: point.y,
            constrainSquare: constrainSquareOrCircle && draft.opMode === "replace",
          });
        } else {
          state.updateSelectionDraft({
            kind: "ellipse",
            x1: point.x,
            y1: point.y,
            constrainCircle: constrainSquareOrCircle && draft.opMode === "replace",
          });
        }
        onChanged();
        return true;
      }

      const point = clientToPixelClamped(event.clientX, event.clientY, canvas);
      if (!point) return true;
      const session = state.floatSession;
      if (!session) return true;

      if (gesture.kind === "move") {
        const dx = point.x - gesture.startDoc.x;
        const dy = point.y - gesture.startDoc.y;
        state.updateFloatTransform({
          ...gesture.startTransform,
          x: gesture.startTransform.x + dx,
          y: gesture.startTransform.y + dy,
        });
        gesture.started = true;
        onChanged();
        return true;
      }

      if (gesture.kind === "scale") {
        state.updateFloatTransform(
          scaleFromHandle(
            gesture.handle,
            gesture.startTransform,
            point,
            gesture.startDoc,
            event.shiftKey,
            event.altKey,
            gesture.aspect,
          ),
        );
        gesture.started = true;
        onChanged();
        return true;
      }

      if (gesture.kind === "rotate") {
        const angle = Math.atan2(
          point.y + 0.5 - gesture.center.y,
          point.x + 0.5 - gesture.center.x,
        );
        let deg =
          gesture.startRotation + ((angle - gesture.startAngle) * 180) / Math.PI;
        deg = snapRotationDegrees(deg, event.shiftKey);
        state.updateFloatTransform({
          ...session.transform,
          rotation: deg,
        });
        gesture.started = true;
        onChanged();
        return true;
      }

      return true;
    },
    [onChanged],
  );

  const handleSelectionPointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return false;
      gestureRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (gesture.kind === "draft") {
        useEditorCanvasStore.getState().commitSelectionDraft();
        onChanged();
        return true;
      }

      // Float drag ends but float stays active until commit.
      onChanged();
      return true;
    },
    [onChanged],
  );

  const handleSelectionPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return false;
      gestureRef.current = null;
      if (gesture.kind === "draft") {
        useEditorCanvasStore.getState().cancelSelectionDraft();
        onChanged();
      }
      return true;
    },
    [onChanged],
  );

  // Space reposition while drafting rect/ellipse.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.kind !== "draft") return;
      if (event.code === "Space") {
        event.preventDefault();
        gesture.spaceHeld = true;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        useEditorCanvasStore.getState().cancelSelectionDraft();
        gestureRef.current = null;
        onChanged();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.kind !== "draft") return;
      if (event.code === "Space") {
        gesture.spaceHeld = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onChanged]);

  return {
    handleSelectionPointerDown,
    handleSelectionPointerMove,
    handleSelectionPointerUp,
    handleSelectionPointerCancel,
  };
}
