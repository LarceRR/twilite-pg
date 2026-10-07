import { Children, isValidElement, type ReactNode } from "react";

const DANGER_LABELS = new Set(["удалить", "delete"]);

export function collectLabelText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return collectLabelText(child.props.children);
      }
      return "";
    })
    .join("");
}

export function isDangerItemLabel(text: string): boolean {
  return DANGER_LABELS.has(text.replace(/\s+/g, " ").trim().toLowerCase());
}
