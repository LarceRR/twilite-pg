type Snapshot = {
  overflow: string;
  paddingRight: string;
  scrollY: number;
};

let locks = 0;
let snapshot: Snapshot | null = null;

function applyScrollLock(): Snapshot {
  const root = document.documentElement;
  const saved = {
    overflow: root.style.overflow,
    paddingRight: root.style.paddingRight,
    scrollY: window.scrollY,
  };
  const gap = Math.max(0, window.innerWidth - root.clientWidth);
  root.style.overflow = "hidden";
  if (gap > 0) root.style.paddingRight = `${gap}px`;
  return saved;
}

function releaseScrollLock(saved: Snapshot): void {
  const root = document.documentElement;
  root.style.overflow = saved.overflow;
  root.style.paddingRight = saved.paddingRight;
  if (window.scrollY !== saved.scrollY) window.scrollTo(0, saved.scrollY);
}

export function lockPageScroll(): () => void {
  if (locks === 0) snapshot = applyScrollLock();
  locks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    if (locks > 0 || !snapshot) return;
    releaseScrollLock(snapshot);
    snapshot = null;
  };
}

export function resetPageScrollLockForTests(): void {
  locks = 0;
  snapshot = null;
  document.documentElement.style.overflow = "";
  document.documentElement.style.paddingRight = "";
}
