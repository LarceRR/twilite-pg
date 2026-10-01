import { describe, expect, it } from "vitest";
import { SEARCH_MOCK_ITEMS } from "@/shared/const/searchMocks";
import { generatePartials, searchItems } from "@/shared/lib/search";

describe("searchItems", () => {
  it("returns all items when query is empty", () => {
    const outcome = searchItems(SEARCH_MOCK_ITEMS, "");
    expect(outcome.hits).toHaveLength(SEARCH_MOCK_ITEMS.length);
    expect(outcome.strategy).toBe("all");
  });

  it("finds exact project title", () => {
    const outcome = searchItems(SEARCH_MOCK_ITEMS, "ресторан");
    expect(outcome.hits.some((hit) => hit.item.title === "Ресторан")).toBe(true);
    expect(outcome.strategy).toBe("exact");
  });

  it("never returns empty hits for nonsense query", () => {
    const outcome = searchItems(SEARCH_MOCK_ITEMS, "zzzqqqxxx");
    expect(outcome.hits.length).toBeGreaterThan(0);
    expect(outcome.isRelaxed).toBe(true);
  });

  it("relaxes multi-word queries via partials", () => {
    const partials = generatePartials("тихий неоновый вечер");
    expect(partials.length).toBeGreaterThan(1);
    expect(partials).toContain("тихий");
  });
});
