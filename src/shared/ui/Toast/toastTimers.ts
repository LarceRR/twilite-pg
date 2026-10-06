type TimerEntry = {
  remaining: number;
  startedAt: number;
  paused: boolean;
  handle: ReturnType<typeof setTimeout> | null;
  onDone: () => void;
};

const timers = new Map<string, TimerEntry>();

function clearHandle(entry: TimerEntry): void {
  if (entry.handle !== null) {
    clearTimeout(entry.handle);
    entry.handle = null;
  }
}

function arm(id: string, entry: TimerEntry): void {
  clearHandle(entry);
  if (entry.paused || entry.remaining <= 0) {
    return;
  }
  entry.startedAt = Date.now();
  entry.handle = setTimeout(() => {
    timers.delete(id);
    entry.onDone();
  }, entry.remaining);
}

export function scheduleToastDismiss(id: string, duration: number, onDone: () => void): void {
  clearToastTimer(id);
  if (duration <= 0) {
    return;
  }
  const entry: TimerEntry = {
    remaining: duration,
    startedAt: Date.now(),
    paused: false,
    handle: null,
    onDone,
  };
  timers.set(id, entry);
  arm(id, entry);
}

export function pauseToastTimer(id: string): void {
  const entry = timers.get(id);
  if (!entry || entry.paused) {
    return;
  }
  entry.paused = true;
  if (entry.handle !== null) {
    entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
    clearHandle(entry);
  }
}

export function resumeToastTimer(id: string): void {
  const entry = timers.get(id);
  if (!entry || !entry.paused) {
    return;
  }
  entry.paused = false;
  arm(id, entry);
}

export function pauseAllToastTimers(): void {
  for (const id of timers.keys()) {
    pauseToastTimer(id);
  }
}

export function resumeAllToastTimers(): void {
  for (const id of timers.keys()) {
    resumeToastTimer(id);
  }
}

export function clearToastTimer(id: string): void {
  const entry = timers.get(id);
  if (!entry) {
    return;
  }
  clearHandle(entry);
  timers.delete(id);
}

export function clearAllToastTimers(): void {
  for (const id of [...timers.keys()]) {
    clearToastTimer(id);
  }
}

/** Test helper */
export function resetToastTimersForTests(): void {
  clearAllToastTimers();
}
