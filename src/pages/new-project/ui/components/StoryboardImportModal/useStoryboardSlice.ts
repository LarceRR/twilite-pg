import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clampRectIntersectingSheet,
  nextAdjacentRect,
  snapRect,
  type NativeCropRect,
} from "@/shared/store/editorCanvas";

export function useStoryboardSlice(nativeWidth: number, nativeHeight: number) {
  const initialRect = useMemo<NativeCropRect>(
    () => ({
      x: 0,
      y: 0,
      w: Math.max(1, nativeWidth),
      h: Math.max(1, nativeHeight),
    }),
    [nativeWidth, nativeHeight],
  );

  const [confirmedRects, setConfirmedRects] = useState<NativeCropRect[]>([]);
  const [draftRect, setDraftRectState] = useState<NativeCropRect>(initialRect);
  const [sessionSize, setSessionSize] = useState<{ w: number; h: number } | null>(null);
  const [allowVariableSize, setAllowVariableSize] = useState(false);
  const [reeditFromIndex, setReeditFromIndex] = useState<number | null>(null);

  useEffect(() => {
    setConfirmedRects([]);
    setDraftRectState(initialRect);
    setSessionSize(null);
    setReeditFromIndex(null);
  }, [initialRect, nativeWidth, nativeHeight]);

  const setDraftRect = useCallback(
    (next: NativeCropRect) => {
      let rect = snapRect(next);
      if (sessionSize && !allowVariableSize) {
        rect = { ...rect, w: sessionSize.w, h: sessionSize.h };
      }
      setDraftRectState(clampRectIntersectingSheet(rect, nativeWidth, nativeHeight));
    },
    [allowVariableSize, nativeHeight, nativeWidth, sessionSize],
  );

  /** Last confirmed slice, drawn inside the moving crop. */
  const onionRect = useMemo(() => {
    if (reeditFromIndex !== null) {
      return confirmedRects[reeditFromIndex - 1] ?? null;
    }
    if (confirmedRects.length === 0) {
      return null;
    }
    return confirmedRects[confirmedRects.length - 1]!;
  }, [confirmedRects, reeditFromIndex]);

  const canResize = allowVariableSize || confirmedRects.length === 0;

  const confirmCurrent = useCallback(() => {
    const rect = clampRectIntersectingSheet(draftRect, nativeWidth, nativeHeight);
    if (reeditFromIndex !== null) {
      setConfirmedRects((prev) => {
        const head = prev.slice(0, reeditFromIndex);
        return [...head, rect];
      });
      setReeditFromIndex(null);
      setDraftRectState(nextAdjacentRect(rect, nativeWidth, nativeHeight));
    } else {
      setConfirmedRects((prev) => [...prev, rect]);
      setDraftRectState(nextAdjacentRect(rect, nativeWidth, nativeHeight));
    }
    if (!sessionSize) {
      setSessionSize({ w: rect.w, h: rect.h });
    }
  }, [draftRect, nativeHeight, nativeWidth, reeditFromIndex, sessionSize]);

  const goBack = useCallback(() => {
    if (confirmedRects.length === 0) {
      return;
    }
    const prev = confirmedRects[confirmedRects.length - 1]!;
    const nextLength = confirmedRects.length - 1;
    setConfirmedRects((items) => items.slice(0, -1));
    setReeditFromIndex(null);
    setDraftRect(prev);
    if (nextLength <= 0) {
      setSessionSize(null);
    }
  }, [confirmedRects, setDraftRect]);

  const jumpToEdit = useCallback(
    (index: number) => {
      const rect = confirmedRects[index];
      if (!rect) {
        return;
      }
      setReeditFromIndex(index);
      setDraftRect(rect);
    },
    [confirmedRects, setDraftRect],
  );

  const trimAndEdit = useCallback(
    (index: number) => {
      setConfirmedRects((prev) => {
        const next = prev.slice(0, index + 1);
        const rect = next[index];
        if (rect) {
          setDraftRectState(clampRectIntersectingSheet(rect, nativeWidth, nativeHeight));
        }
        return next;
      });
      setReeditFromIndex(index);
    },
    [nativeHeight, nativeWidth],
  );

  const frameSize = confirmedRects[0] ?? null;
  const sizesDiffer =
    frameSize !== null &&
    confirmedRects.some((rect) => rect.w !== frameSize.w || rect.h !== frameSize.h);
  const frameOverflow =
    frameSize !== null &&
    confirmedRects.some((rect) => rect.w > frameSize.w || rect.h > frameSize.h);

  return {
    confirmedRects,
    draftRect,
    setDraftRect,
    allowVariableSize,
    setAllowVariableSize,
    onionRect,
    canResize,
    confirmCurrent,
    goBack,
    jumpToEdit,
    trimAndEdit,
    reeditFromIndex,
    sizesDiffer,
    frameOverflow,
    pickingIndex: reeditFromIndex ?? confirmedRects.length,
  };
}
