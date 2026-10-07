import {
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { collectLabelText, isDangerItemLabel } from "./dangerLabel";

export type PopoverItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

function joinClassName(current: string | undefined, extra: string | false): string | undefined {
  if (!extra) {
    return current;
  }
  return current ? `${current} ${extra}` : extra;
}

/** Menu row. Labels Delete / Удалить get danger text+icon color at render time. */
export function PopoverItem({ children, className, type = "button", ...props }: PopoverItemProps) {
  const danger = isDangerItemLabel(collectLabelText(children));

  return (
    <button
      {...props}
      type={type}
      className={joinClassName(className, danger && "popover__danger")}
    >
      {children}
    </button>
  );
}
