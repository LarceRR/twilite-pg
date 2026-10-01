import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./HomePage";

describe("HomePage", () => {
  it("renders the homepage shell", () => {
    const { container } = render(<HomePage />);

    expect(container.querySelector("section.homepage")).not.toBeNull();
  });
});
