const listeners = new Set<(ownerId: string) => void>();

let openCount = 0;
let cooldownUntil = 0;

const COOLDOWN_MS = 500;

export function hoverOpenDelay(warmMs: number, now = Date.now()): number {
  if (openCount > 0 || now < cooldownUntil) return 0;
  return warmMs;
}

export function noteTooltipOpened(): void {
  openCount += 1;
}

export function noteTooltipClosed(now = Date.now()): void {
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0) cooldownUntil = now + COOLDOWN_MS;
}

export function claimTooltip(id: string): void {
  for (const listener of listeners) listener(id);
}

export function subscribeTooltipOwner(listener: (ownerId: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetTooltipGroup(): void {
  openCount = 0;
  cooldownUntil = 0;
  listeners.clear();
}
