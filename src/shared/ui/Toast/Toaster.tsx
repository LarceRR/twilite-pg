import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import { toast as toastApi } from "./toastApi";
import { computeToastStackLayout, sumHeightsBefore } from "./toastStack";
import {
  pauseAllToastTimers,
  resumeAllToastTimers,
} from "./toastTimers";
import { useDocumentHidden } from "./useDocumentHidden";
import { useToastHeights } from "./useToastHeights";
import { useToastStore } from "./toastStore";
import { TOAST_GAP_PX, TOAST_STACK_OFFSET_PX } from "./toastTypes";
import { ToastItem } from "./ToastItem";
import "./Toast.scss";

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const expanded = useToastStore((state) => state.expanded);
  const exitingIds = useToastStore((state) => state.exitingIds);
  const setExpanded = useToastStore((state) => state.setExpanded);
  const listRef = useRef<HTMLOListElement>(null);
  const documentHidden = useDocumentHidden();

  const orderedIds = useMemo(() => toasts.map((item) => item.id), [toasts]);
  const heights = useToastHeights(orderedIds, listRef);
  const frontHeight = heights.find((entry) => entry.id === toasts[0]?.id)?.height ?? 52;
  const stackHeight = expanded
    ? heights.reduce((sum, entry) => sum + entry.height, 0) +
      Math.max(0, toasts.length - 1) * TOAST_GAP_PX
    : frontHeight + Math.max(0, toasts.length - 1) * TOAST_STACK_OFFSET_PX;

  useEffect(() => {
    if (documentHidden || expanded) {
      pauseAllToastTimers();
      return;
    }
    resumeAllToastTimers();
  }, [documentHidden, expanded, toasts]);

  useEffect(() => {
    if (toasts.length === 0 && expanded) {
      setExpanded(false);
    }
  }, [expanded, setExpanded, toasts.length]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <section className="toast-viewport" aria-label="Уведомления">
      <ol
        ref={listRef}
        className="toast-viewport__list"
        style={toasts.length > 0 ? { height: Math.max(stackHeight, frontHeight) } : undefined}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocusCapture={() => setExpanded(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setExpanded(false);
          }
        }}
      >
        {toasts.map((item, index) => {
          const layout = computeToastStackLayout({
            index,
            expanded,
            frontHeight,
            heightsBefore: sumHeightsBefore(heights, orderedIds, index),
          });
          return (
            <ToastItem
              key={item.id}
              toast={item}
              index={index}
              expanded={expanded}
              leaving={exitingIds.includes(item.id)}
              offsetY={layout.offsetY}
              scale={layout.scale}
              clippedHeight={layout.clippedHeight}
              front={index === 0}
              paused={expanded || documentHidden}
              onDismiss={toastApi.dismiss}
            />
          );
        })}
      </ol>
    </section>,
    document.body,
  );
}
