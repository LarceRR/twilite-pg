import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EditorRightToolsSidebar } from "./EditorRightToolsSidebar";

describe("EditorRightToolsSidebar", () => {
  afterEach(() => {
    cleanup();
  });

  it("replaces the duplicate layers tab with export", () => {
    render(<EditorRightToolsSidebar />);

    expect(screen.getAllByText("Слои")).toHaveLength(1);
    fireEvent.click(screen.getByText("Экспорт"));

    expect(screen.getByRole("button", { name: "PNG кадра" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PNG spritesheet" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Скачать TPO" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Отправить на модерацию" })).toBeDisabled();
    expect(screen.getByText(/Недостаточно прав/)).toBeTruthy();
  });
});
