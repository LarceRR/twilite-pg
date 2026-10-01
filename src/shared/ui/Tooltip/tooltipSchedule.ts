import { claimTooltip, hoverOpenDelay } from "./tooltipGroup";

type TimerBag = { current: number[] };

type ScheduleArgs = {
  show: boolean;
  immediate: boolean;
  openDelay: number;
  closeDelay: number;
  id: string;
  setOpen: (open: boolean) => void;
};

export function clearTooltipTimers(bag: TimerBag): void {
  for (const id of bag.current) window.clearTimeout(id);
  bag.current = [];
}

function arm(bag: TimerBag, delay: number, run: () => void): void {
  clearTooltipTimers(bag);
  bag.current = [window.setTimeout(run, delay)];
}

function showTooltip(args: ScheduleArgs): void {
  claimTooltip(args.id);
  args.setOpen(true);
}

export function scheduleTooltip(bag: TimerBag, args: ScheduleArgs): void {
  if (!args.show) {
    if (args.closeDelay <= 0) {
      clearTooltipTimers(bag);
      args.setOpen(false);
      return;
    }
    arm(bag, args.closeDelay, () => args.setOpen(false));
    return;
  }
  const delay = args.immediate ? 0 : hoverOpenDelay(args.openDelay);
  if (delay <= 0) {
    clearTooltipTimers(bag);
    showTooltip(args);
    return;
  }
  arm(bag, delay, () => showTooltip(args));
}
