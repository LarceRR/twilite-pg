import { Component, Suspense, use, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { isThenable, type TooltipChild } from "./tooltipAnchor";

const promiseKeys = new WeakMap<object, number>();
let nextPromiseKey = 1;

function promiseKey(promise: object): number {
  const existing = promiseKeys.get(promise);
  if (existing) return existing;
  nextPromiseKey += 1;
  promiseKeys.set(promise, nextPromiseKey);
  return nextPromiseKey;
}

class TooltipErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <span>Couldn&apos;t load</span>;
    return this.props.children;
  }
}

function TooltipSpinner() {
  return (
    <span className="tooltip__status" role="status">
      <LoaderCircle className="tooltip__spin" size={14} aria-hidden="true" />
      <span className="tooltip__status-text">Loading</span>
    </span>
  );
}

function PromiseChildren({ promise }: { promise: Promise<ReactNode> }) {
  return use(promise);
}

export function TooltipBody({ children }: { children: TooltipChild }) {
  if (!isThenable(children)) return children;
  return (
    <TooltipErrorBoundary key={promiseKey(children)}>
      <Suspense fallback={<TooltipSpinner />}>
        <PromiseChildren promise={children} />
      </Suspense>
    </TooltipErrorBoundary>
  );
}
