import { cloneElement, isValidElement, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactElement, type ReactNode, type Ref } from "react";

type DomProps = {
  ref?: Ref<HTMLElement>;
  disabled?: boolean;
  style?: CSSProperties;
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
};

export type TooltipHandlers = {
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

function chain<E>(ours: (event: E) => void, theirs?: (event: E) => void) {
  if (!theirs) return ours;
  return (event: E) => {
    ours(event);
    theirs(event);
  };
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") {
    ref(node);
    return;
  }
  if (ref) ref.current = node;
}

export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) assignRef(ref, node);
  };
}

function joinIds(current: string | undefined, extra: string | undefined): string | undefined {
  const value = [current, extra].filter(Boolean).join(" ");
  return value || undefined;
}

function ariaProps(props: DomProps, describedBy?: string, labelledBy?: string): DomProps {
  return {
    "aria-describedby": labelledBy ? props["aria-describedby"] : joinIds(props["aria-describedby"], describedBy),
    "aria-labelledby": joinIds(props["aria-labelledby"], labelledBy),
  };
}

function chainedHandlers(props: DomProps, handlers: TooltipHandlers): TooltipHandlers {
  return {
    onPointerEnter: chain(handlers.onPointerEnter, props.onPointerEnter),
    onPointerLeave: chain(handlers.onPointerLeave, props.onPointerLeave),
    onFocus: chain(handlers.onFocus, props.onFocus),
    onBlur: chain(handlers.onBlur, props.onBlur),
    onKeyDown: chain(handlers.onKeyDown, props.onKeyDown),
  };
}

export function isThenable(value: unknown): value is Promise<ReactNode> {
  return typeof value === "object"
    && value !== null
    && typeof (value as { then?: unknown }).then === "function";
}

export type TooltipChild = ReactNode | Promise<ReactNode>;

export function hasTooltipContent(children: TooltipChild): boolean {
  if (isThenable(children)) return true;
  if (typeof children === "string" || typeof children === "number") return String(children).trim() !== "";
  return children !== null && children !== undefined && children !== false && children !== true;
}

type AnchorOptions = {
  trigger: ReactNode;
  anchorRef: Ref<HTMLElement>;
  handlers: TooltipHandlers;
  describedBy?: string;
  labelledBy?: string;
};

function renderDomAnchor(node: ReactElement<DomProps>, options: AnchorOptions): ReactElement {
  const props = node.props;
  const aria = ariaProps(props, options.describedBy, options.labelledBy);
  const events = chainedHandlers(props, options.handlers);
  if (props.disabled) {
    return (
      <span ref={options.anchorRef} className="tooltip__anchor" {...options.handlers}>
        {cloneElement(node, { ...aria, style: { ...props.style, pointerEvents: "none" } })}
      </span>
    );
  }
  return cloneElement(node, { ...aria, ...events, ref: mergeRefs(props.ref, options.anchorRef) });
}

export function renderTooltipAnchor(options: AnchorOptions): ReactElement {
  const { trigger, anchorRef, handlers, describedBy, labelledBy } = options;
  if (!isValidElement(trigger) || typeof trigger.type !== "string") {
    return (
      <span ref={anchorRef} className="tooltip__anchor" {...handlers} aria-describedby={describedBy} aria-labelledby={labelledBy}>
        {isValidElement(trigger) ? cloneElement(trigger as ReactElement<DomProps>, ariaProps(trigger.props as DomProps, describedBy, labelledBy)) : trigger}
      </span>
    );
  }
  return renderDomAnchor(trigger as ReactElement<DomProps>, options);
}
