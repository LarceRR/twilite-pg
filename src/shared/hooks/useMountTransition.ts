import { useEffect, useState } from "react";

interface UseMountTransitionOptions {
  isOpen: boolean;
  durationMs?: number;
}

/** Keeps children mounted while exit animation plays. */
export function useMountTransition({
  isOpen,
  durationMs = 220,
}: UseMountTransitionOptions) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => setIsMounted(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [isOpen, durationMs]);

  return { isMounted, isVisible };
}
