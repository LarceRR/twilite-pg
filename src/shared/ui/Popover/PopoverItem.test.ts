import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { collectLabelText, isDangerItemLabel } from "./dangerLabel";
import { PopoverItem } from "./PopoverItem";

describe("isDangerItemLabel", () => {
  it("matches Delete / Удалить ignoring case and spacing", () => {
    expect(isDangerItemLabel("Удалить")).toBe(true);
    expect(isDangerItemLabel(" delete ")).toBe(true);
    expect(isDangerItemLabel("Delete")).toBe(true);
    expect(isDangerItemLabel("Переименовать")).toBe(false);
  });
});

describe("collectLabelText", () => {
  it("ignores icon elements and keeps the label", () => {
    expect(collectLabelText([createElement("svg"), " Удалить "])).toBe(" Удалить ");
  });
});

describe("PopoverItem", () => {
  it("adds danger class at render for Delete/Удалить", () => {
    const danger = renderToStaticMarkup(
      createElement(PopoverItem, null, createElement("svg"), "Удалить"),
    );
    const normal = renderToStaticMarkup(createElement(PopoverItem, null, "Rename"));

    expect(danger).toContain("popover__danger");
    expect(normal).not.toContain("popover__danger");
  });
});
