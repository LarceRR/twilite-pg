import { describe, expect, it } from "vitest";

import {
  buildDedupeKey,
  dismissToastFromList,
  formatToastCountLabel,
  pushToastIntoList,
} from "./toastModel";

describe("formatToastCountLabel", () => {
  it("hides x1 and returns xN for duplicates", () => {
    expect(formatToastCountLabel(1)).toBeNull();
    expect(formatToastCountLabel(2)).toBe("x2");
    expect(formatToastCountLabel(3)).toBe("x3");
  });
});

describe("buildDedupeKey", () => {
  it("uses an explicit key when provided", () => {
    expect(
      buildDedupeKey({ type: "error", title: "A", description: "B", dedupeKey: " custom " }),
    ).toBe("custom");
  });

  it("falls back to type+title+description", () => {
    expect(buildDedupeKey({ type: "info", title: " Hello ", description: " world " })).toBe(
      "info:Hello:world",
    );
  });
});

describe("pushToastIntoList", () => {
  it("creates a toast and bumps duplicates in place", () => {
    const first = pushToastIntoList([], { title: "Ошибка", type: "error" }, 5);
    expect(first.result?.kind).toBe("created");
    expect(first.toasts).toHaveLength(1);

    const bumped = pushToastIntoList(first.toasts, { title: "Ошибка", type: "error" }, 5);
    expect(bumped.result?.kind).toBe("bumped");
    expect(bumped.toasts).toHaveLength(1);
    expect(bumped.toasts[0]?.count).toBe(2);
    expect(bumped.toasts[0]?.id).toBe(first.toasts[0]?.id);
  });

  it("evicts the oldest toast when the visible cap is exceeded", () => {
    let toasts = pushToastIntoList([], { title: "A", type: "info" }, 2).toasts;
    toasts = pushToastIntoList(toasts, { title: "B", type: "info" }, 2).toasts;
    const third = pushToastIntoList(toasts, { title: "C", type: "info" }, 2);
    expect(third.toasts.map((toast) => toast.title)).toEqual(["C", "B"]);
    expect(third.result?.kind === "created" && third.result.evictedId).toBe(toasts[1]?.id);
  });

  it("ignores empty titles", () => {
    const result = pushToastIntoList([], { title: "   " }, 5);
    expect(result.result).toBeNull();
    expect(result.toasts).toEqual([]);
  });

  it("makes errors sticky by default (duration 0)", () => {
    const { toasts } = pushToastIntoList([], { title: "Сбой", type: "error" }, 5);
    expect(toasts[0]?.duration).toBe(0);
  });
});

describe("dismissToastFromList", () => {
  it("removes by id", () => {
    const { toasts } = pushToastIntoList([], { title: "A" }, 5);
    expect(dismissToastFromList(toasts, toasts[0]!.id)).toEqual([]);
  });
});
