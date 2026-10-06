import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Popover } from "./Popover";
import { PopoverItem } from "./PopoverItem";

function rect(partial: Partial<DOMRect>): DOMRect {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON() {
      return {};
    },
    ...partial,
  } as DOMRect;
}

function ControlledPopover() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} content={<div role="menu">Actions</div>}>
      <button type="button">More</button>
    </Popover>
  );
}

function ControlledDangerPopover() {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      content={
        <div role="menu">
          <PopoverItem>Rename</PopoverItem>
          <PopoverItem>Удалить</PopoverItem>
        </div>
      }
    >
      <button type="button">More</button>
    </Popover>
  );
}

describe("Popover", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.classList.contains("popover")) {
        return rect({ width: 160, height: 80, right: 160, bottom: 80 });
      }
      return rect({
        x: 120,
        y: 200,
        left: 120,
        top: 200,
        width: 28,
        height: 28,
        right: 148,
        bottom: 228,
      });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens from the trigger and closes on Escape", () => {
    render(<ControlledPopover />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menu")).toHaveTextContent("Actions");
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on outside pointerdown", () => {
    render(<ControlledPopover />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("portals the panel onto document.body", () => {
    render(<ControlledPopover />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const panel = screen.getByRole("menu").closest(".popover");
    expect(panel).not.toBeNull();
    expect(panel?.parentElement).toBe(document.body);
  });

  it("styles Delete/Удалить via PopoverItem at render time", () => {
    render(<ControlledDangerPopover />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("button", { name: "Удалить" })).toHaveClass("popover__danger");
    expect(screen.getByRole("button", { name: "Rename" })).not.toHaveClass("popover__danger");
  });
});
