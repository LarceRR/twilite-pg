import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type TransitionEvent } from "react";

import { formatToastCountLabel } from "./toastModel";
import { useToastStore } from "./toastStore";
import type { ToastRecord, ToastType } from "./toastTypes";

const ICONS: Record<ToastType, typeof Info> = {
  info: Info,
  warn: AlertTriangle,
  success: CheckCircle2,
  error: AlertCircle,
};

const EXIT_FALLBACK_MS = 360;

export type ToastItemProps = {
  toast: ToastRecord;
  index: number;
  expanded: boolean;
  leaving: boolean;
  offsetY: number;
  scale: number;
  clippedHeight: number | null;
  front: boolean;
  /** Freeze countdown bar + timer (hover / tab hidden). */
  paused: boolean;
  onDismiss: (id: string) => void;
};

export function ToastItem({
  toast,
  index,
  expanded,
  leaving,
  offsetY,
  scale,
  clippedHeight,
  front,
  paused,
  onDismiss,
}: ToastItemProps) {
  const Icon = ICONS[toast.type];
  const countLabel = formatToastCountLabel(toast.count);
  const role = toast.type === "error" || toast.type === "warn" ? "alert" : "status";
  const [mounted, setMounted] = useState(false);
  const finishExit = useToastStore((state) => state.finishExit);
  const hasDescription = Boolean(toast.description);
  const showProgress = toast.duration > 0 && !leaving;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!leaving) {
      return;
    }
    const timer = window.setTimeout(() => finishExit(toast.id), EXIT_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [finishExit, leaving, toast.id]);

  const style = {
    "--toast-offset": `${offsetY}px`,
    "--toast-scale": String(scale),
    "--toast-z": String(1000 - index),
    ...(clippedHeight !== null ? { "--toast-clip-height": `${clippedHeight}px` } : {}),
  } as CSSProperties;

  const onTransitionEnd = (event: TransitionEvent<HTMLLIElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (!leaving) {
      return;
    }
    if (event.propertyName === "opacity" || event.propertyName === "transform") {
      finishExit(toast.id);
    }
  };

  return (
    <li
      className="toast"
      data-toast-id={toast.id}
      data-type={toast.type}
      data-expanded={expanded ? "true" : "false"}
      data-front={front ? "true" : "false"}
      data-mounted={mounted ? "true" : "false"}
      data-leaving={leaving ? "true" : "false"}
      data-has-description={hasDescription ? "true" : "false"}
      data-index={index}
      role={role}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      style={style}
      onTransitionEnd={onTransitionEnd}
    >
      <span className="toast__icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <div className="toast__body">
        <div className="toast__title-row">
          <p className="toast__title">{toast.title}</p>
          {countLabel ? <span className="toast__count">{countLabel}</span> : null}
        </div>
        {toast.description ? <p className="toast__description">{toast.description}</p> : null}
      </div>
      <button
        type="button"
        className="toast__close"
        aria-label="Закрыть уведомление"
        onClick={() => onDismiss(toast.id)}
      >
        <X size={16} aria-hidden="true" />
      </button>
      {showProgress ? (
        <span
          key={toast.createdAt}
          className="toast__progress"
          aria-hidden="true"
          style={{
            animationDuration: `${toast.duration}ms`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      ) : null}
    </li>
  );
}
