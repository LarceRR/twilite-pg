import { afterEach, describe, expect, it, vi } from "vitest";

import {
  listMyPixelObjectsPage,
  listPixelObjectModerationPage,
  listPublishedPixelObjectsPage,
} from "./pixelObjects";

function okListResponse(nextCursor: string | null = "cursor-2"): Response {
  return new Response(JSON.stringify({ items: [], nextCursor }), { status: 200 });
}

describe("pixelObjects list pagination", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends cursor/limit and reads nextCursor for catalog/mine/moderation", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(okListResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const catalog = await listPublishedPixelObjectsPage({ cursor: "cursor-1", limit: 20 });
    await listMyPixelObjectsPage({ cursor: "mine-1", limit: 10 });
    await listPixelObjectModerationPage({ limit: 5 });

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls[0]).toContain("/v1/tpg/pixel-objects?");
    expect(urls[0]).toContain("cursor=cursor-1");
    expect(urls[0]).toContain("limit=20");
    expect(urls[1]).toContain("/v1/tpg/pixel-objects/mine?");
    expect(urls[1]).toContain("cursor=mine-1");
    expect(urls[2]).toContain("/v1/tpg/pixel-objects/moderation?");
    expect(urls[2]).toContain("limit=5");
    expect(catalog.nextCursor).toBe("cursor-2");
  });
});
