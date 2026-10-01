import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tooltip } from "./Tooltip";
import { resetTooltipGroup } from "./tooltipGroup";

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

function installPointerEvent() {
  if (typeof window.PointerEvent === "function") return;
  class PointerEvent extends MouseEvent {
    pointerType: string;
    constructor(type: string, init: MouseEventInit & { pointerType?: string } = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? "";
    }
  }
  Object.defineProperty(window, "PointerEvent", { configurable: true, writable: true, value: PointerEvent });
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Tooltip", () => {
  beforeEach(() => {
    installPointerEvent();
    resetTooltipGroup();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("tooltip")) return rect({ width: 80, height: 24, right: 80, bottom: 24 });
      return rect({ x: 120, y: 200, left: 120, top: 200, width: 40, height: 24, right: 160, bottom: 224 });
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("describes the trigger after keyboard focus", () => {
    render(<Tooltip content="Saved locally"><button>Save</button></Tooltip>);
    fireEvent.focus(screen.getByRole("button", { name: "Save" }));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Saved locally");
    expect(screen.getByRole("button")).toHaveAttribute("aria-describedby", tooltip.id);
  });

  it("waits out the hover delay and ignores touch hover", () => {
    vi.useFakeTimers();
    render(<Tooltip content="Hint"><button>Save</button></Tooltip>);
    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.pointerEnter(button, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    fireEvent.pointerEnter(button, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(399));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Hint");
  });

  it("closes on escape and after blur", () => {
    vi.useFakeTimers();
    render(<Tooltip content="Hint"><button>Save</button></Tooltip>);
    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.focus(button);
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    fireEvent.focus(button);
    fireEvent.blur(button);
    act(() => vi.advanceTimersByTime(120));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows a spinner until promised children resolve", async () => {
    const pending = deferred<string>();
    render(<Tooltip content={pending.promise}><button>Info</button></Tooltip>);
    await act(async () => {
      fireEvent.focus(screen.getByRole("button", { name: "Info" }));
    });
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    await act(async () => {
      pending.resolve("Ready");
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Ready");
  });

  it("shows a fallback when promised children reject", async () => {
    const pending = deferred<string>();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    pending.promise.catch(() => undefined);
    render(<Tooltip content={pending.promise}><button>Info</button></Tooltip>);
    await act(async () => {
      fireEvent.focus(screen.getByRole("button", { name: "Info" }));
    });
    await act(async () => {
      pending.reject(new Error("no"));
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Couldn't load");
    consoleError.mockRestore();
  });

  it("labels an unnamed trigger when asked", () => {
    render(<Tooltip asLabel content="Save the file"><button>Save</button></Tooltip>);
    fireEvent.focus(screen.getByRole("button", { name: "Save" }));
    const label = screen.getByText("Save the file");
    expect(screen.getByRole("button")).toHaveAttribute("aria-labelledby", label.id);
  });

  it("does not open when disabled or empty", () => {
    const { rerender } = render(<Tooltip disabled content="Hint"><button>Save</button></Tooltip>);
    fireEvent.focus(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    rerender(<Tooltip content={null}><button>Save</button></Tooltip>);
    fireEvent.focus(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens the next tooltip immediately during the warmup window", () => {
    vi.useFakeTimers();
    render(
      <>
        <Tooltip content="First"><button>One</button></Tooltip>
        <Tooltip content="Second"><button>Two</button></Tooltip>
      </>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "One" }));
    fireEvent.blur(screen.getByRole("button", { name: "One" }));
    act(() => vi.advanceTimersByTime(120));
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Two" }), { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Second");
  });

  it("keeps a disabled control hoverable through its anchor", () => {
    vi.useFakeTimers();
    render(<Tooltip content="Can't save"><button disabled>Save</button></Tooltip>);
    const anchor = screen.getByText("Save").parentElement;
    fireEvent.pointerEnter(anchor!, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Can't save");
  });
});

function WarmHost() {
  const [text, setText] = useState<ReactNode>("First");
  return (
    <>
      <button onClick={() => setText("Second")}>Swap</button>
      <Tooltip content={text}><button>Info</button></Tooltip>
    </>
  );
}

describe("Tooltip content freeze", () => {
  beforeEach(() => {
    resetTooltipGroup();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => (
      rect({ x: 120, y: 200, left: 120, top: 200, width: 40, height: 24, right: 160, bottom: 224 })
    ));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps the content that was current when the tooltip opened", () => {
    render(<WarmHost />);
    fireEvent.focus(screen.getByRole("button", { name: "Info" }));
    fireEvent.click(screen.getByRole("button", { name: "Swap" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("First");
  });
});
