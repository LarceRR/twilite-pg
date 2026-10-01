import { useEffect, useId, useRef, useState, type MutableRefObject } from "react";
import { clearTooltipTimers, scheduleTooltip } from "./tooltipSchedule";
import { noteTooltipClosed, noteTooltipOpened, subscribeTooltipOwner } from "./tooltipGroup";

type Flag = MutableRefObject<boolean>;
type TimerBag = MutableRefObject<number[]>;

function dismissTooltip(hovered: Flag, focused: Flag, timers: TimerBag, setOpen: (open: boolean) => void) {
  hovered.current = false;
  focused.current = false;
  clearTooltipTimers(timers);
  setOpen(false);
}

function useTooltipLifecycle(id: string, open: boolean, enabled: boolean, setOpen: (open: boolean) => void, hovered: Flag, focused: Flag, timers: TimerBag) {
  useEffect(() => subscribeTooltipOwner((owner) => {
    if (owner === id) return;
    dismissTooltip(hovered, focused, timers, setOpen);
  }), [focused, hovered, id, setOpen, timers]);

  useEffect(() => {
    if (!enabled) setOpen(false);
  }, [enabled, setOpen]);

  useEffect(() => {
    if (!open) return;
    noteTooltipOpened();
    return () => noteTooltipClosed();
  }, [open]);
}

export function useTooltipOpen(enabled: boolean, openDelay: number, closeDelay: number) {
  const [open, setOpen] = useState(false);
  const hovered = useRef(false);
  const focused = useRef(false);
  const timers = useRef<number[]>([]);
  const id = useId();

  const sync = (immediate: boolean) => scheduleTooltip(timers, {
    show: enabled && (hovered.current || focused.current),
    immediate: immediate || focused.current,
    openDelay,
    closeDelay,
    id,
    setOpen,
  });

  useEffect(() => () => clearTooltipTimers(timers), []);
  useTooltipLifecycle(id, open, enabled, setOpen, hovered, focused, timers);

  return {
    open,
    sync,
    hovered,
    focused,
    id,
    dismiss: () => dismissTooltip(hovered, focused, timers, setOpen),
  };
}
