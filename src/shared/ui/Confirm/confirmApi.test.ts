import { afterEach, describe, expect, it } from "vitest";

import {
  __resetConfirmIdCounterForTests,
  buildConfirmRequest,
  normalizeAlertInput,
  normalizeConfirmInput,
} from "./confirmModel";
import { alert, confirm } from "./confirmApi";
import { useConfirmStore } from "./confirmStore";

describe("confirmModel", () => {
  afterEach(() => {
    __resetConfirmIdCounterForTests();
  });

  it("normalizes string input to title options", () => {
    expect(normalizeConfirmInput("Очистить?")).toEqual({ title: "Очистить?" });
    expect(normalizeAlertInput("Привет")).toEqual({ title: "Привет" });
  });

  it("builds confirm and alert requests with defaults", () => {
    const confirmRequest = buildConfirmRequest("confirm", { title: "Удалить?" });
    expect(confirmRequest).toMatchObject({
      kind: "confirm",
      title: "Удалить?",
      confirmLabel: "Подтвердить",
      cancelLabel: "Отмена",
      danger: false,
    });

    const alertRequest = buildConfirmRequest("alert", { title: "Готово" });
    expect(alertRequest).toMatchObject({
      kind: "alert",
      title: "Готово",
      confirmLabel: "ОК",
    });
  });
});

describe("confirmApi + store", () => {
  afterEach(() => {
    useConfirmStore.getState().reset();
    __resetConfirmIdCounterForTests();
  });

  it("resolves confirm(true) when settled positively", async () => {
    const pending = confirm({
      title: "Удалить проект?",
      description: "Это действие нельзя отменить.",
      confirmLabel: "Удалить",
      danger: true,
    });

    const current = useConfirmStore.getState().current;
    expect(current?.title).toBe("Удалить проект?");
    expect(current?.danger).toBe(true);
    expect(current?.confirmLabel).toBe("Удалить");

    useConfirmStore.getState().settle(current!.id, true);
    await expect(pending).resolves.toBe(true);
    expect(useConfirmStore.getState().current).toBeNull();
  });

  it("resolves confirm(false) on cancel and queues the next dialog", async () => {
    const first = confirm("Первый?");
    const second = alert("Второй");

    const firstId = useConfirmStore.getState().current!.id;
    expect(useConfirmStore.getState().queue).toHaveLength(1);

    useConfirmStore.getState().settle(firstId, false);
    await expect(first).resolves.toBe(false);

    const next = useConfirmStore.getState().current;
    expect(next?.kind).toBe("alert");
    expect(next?.title).toBe("Второй");

    useConfirmStore.getState().settle(next!.id, true);
    await expect(second).resolves.toBeUndefined();
    expect(useConfirmStore.getState().current).toBeNull();
  });
});
