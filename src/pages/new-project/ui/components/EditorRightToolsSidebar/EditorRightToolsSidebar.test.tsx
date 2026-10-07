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

    expect(screen.getByText("PNG кадра")).toBeTruthy();
    expect(screen.getByText("Spritesheet")).toBeTruthy();
    expect(screen.getByText("Пакет TPO")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Скачать" })).toHaveLength(3);
    // Without submit permission the catalog panel (and moderation CTA) stays hidden.
    expect(screen.queryByRole("button", { name: "Отправить на модерацию" })).toBeNull();
  });
});
