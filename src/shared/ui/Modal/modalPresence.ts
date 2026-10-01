import { useCallback, useEffect, useRef, useState } from "react";

const EXIT_MS = 180;

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function useModalPresence(open: boolean) {
  const [present, setPresent] = useState(open);
  const onExited = useCallback(() => setPresent(false), []);

  useEffect(() => {
    if (open) setPresent(true);
  }, [open]);

  return { present: open || present, onExited };
}

export function useModalExit(open: boolean, onExited: () => void) {
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  useEffect(() => {
    if (open) return;
    if (prefersReducedMotion()) {
      onExitedRef.current();
      return;
    }
    const timeout = window.setTimeout(() => onExitedRef.current(), EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [open]);
}
