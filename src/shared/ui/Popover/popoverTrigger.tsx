import {
  cloneElement,
  isValidElement,
  type MouseEvent,
  type ReactElement,
  type Ref,
} from "react";

import { mergeRefs } from "@/shared/ui/Tooltip/tooltipAnchor";

type TriggerProps = {
  ref?: Ref<HTMLElement>;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  "aria-expanded"?: boolean | "true" | "false";
  "aria-haspopup"?: boolean | "false" | "true" | "menu" | "listbox" | "tree" | "grid" | "dialog";
  "aria-controls"?: string;
};

function chainClick(
  ours: (event: MouseEvent<HTMLElement>) => void,
  theirs?: (event: MouseEvent<HTMLElement>) => void,
) {
  if (!theirs) {
    return ours;
  }
  return (event: MouseEvent<HTMLElement>) => {
    theirs(event);
    if (!event.defaultPrevented) {
      ours(event);
    }
  };
}

export function renderPopoverTrigger(options: {
  trigger: ReactElement;
  anchorRef: Ref<HTMLElement>;
  open: boolean;
  popupId: string;
  disabled: boolean;
  onToggle: () => void;
}): ReactElement {
  const { trigger, anchorRef, open, popupId, disabled, onToggle } = options;
  if (!isValidElement(trigger)) {
    throw new Error("Popover children must be a single React element");
  }

  const props = trigger.props as TriggerProps;
  return cloneElement(trigger, {
    ref: mergeRefs(props.ref, anchorRef),
    "aria-expanded": open,
    "aria-haspopup": props["aria-haspopup"] ?? "dialog",
    "aria-controls": open ? popupId : undefined,
    onClick: disabled
      ? props.onClick
      : chainClick(() => {
          onToggle();
        }, props.onClick),
  } as Partial<TriggerProps>);
}
