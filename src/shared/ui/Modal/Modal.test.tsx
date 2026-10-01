import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";
import { lockPageScroll, resetPageScrollLockForTests } from "./scrollLock";

describe("Modal", () => {
  afterEach(() => {
    cleanup();
    resetPageScrollLockForTests();
  });

  it("names the dialog, locks scroll, and focuses the title", () => {
    render(<Modal open onClose={vi.fn()} title="Rename" description="Choose a new name">Body</Modal>);
    const dialog = screen.getByRole("dialog", { name: "Rename" });
    expect(dialog).toHaveAccessibleDescription("Choose a new name");
    expect(document.activeElement).toHaveTextContent("Rename");
    expect(document.documentElement.style.overflow).toBe("hidden");
  });

  it("closes from the close button and the backdrop, but not from the panel", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal open onClose={onClose} title="Rename">Body</Modal>);
    fireEvent.click(screen.getByText("Body"));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<Modal open onClose={onClose} title="Rename">Body</Modal>);
    fireEvent.click(screen.getByRole("dialog", { name: "Rename" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("treats escape as cancel and can ignore it", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal open onClose={onClose} title="Rename">Body</Modal>);
    const dialog = screen.getByRole("dialog", { name: "Rename" });
    const cancel = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<Modal open closeOnEscape={false} onClose={onClose} title="Rename">Body</Modal>);
    const blocked = new Event("cancel", { cancelable: true });
    screen.getByRole("dialog", { name: "Rename" }).dispatchEvent(blocked);
    expect(blocked.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores the backdrop when that dismissal is disabled", () => {
    const onClose = vi.fn();
    render(<Modal open closeOnBackdrop={false} onClose={onClose} title="Rename">Body</Modal>);
    fireEvent.click(screen.getByRole("dialog", { name: "Rename" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("focuses a requested control and returns focus to the opener", async () => {
    const onClose = vi.fn();
    const initialFocusRef = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <>
        <button>Open</button>
        <Modal open={false} onClose={onClose} title="Rename">Body</Modal>
      </>,
    );
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    rerender(
      <>
        <button>Open</button>
        <Modal open onClose={onClose} title="Rename" initialFocusRef={initialFocusRef}>
          <button ref={initialFocusRef}>Save</button>
        </Modal>
      </>,
    );
    expect(document.activeElement).toHaveTextContent("Save");
    rerender(
      <>
        <button>Open</button>
        <Modal open={false} onClose={onClose} title="Rename">Body</Modal>
      </>,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(opener);
    expect(document.documentElement.style.overflow).toBe("");
  });
});

describe("lockPageScroll", () => {
  afterEach(() => {
    cleanup();
    resetPageScrollLockForTests();
  });

  it("stacks locks and ignores a second release", () => {
    const first = lockPageScroll();
    const second = lockPageScroll();
    expect(document.documentElement.style.overflow).toBe("hidden");
    first();
    expect(document.documentElement.style.overflow).toBe("hidden");
    second();
    second();
    expect(document.documentElement.style.overflow).toBe("");
  });
});
