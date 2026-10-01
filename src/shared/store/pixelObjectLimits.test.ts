import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PIXEL_OBJECT_LIMITS } from "@/shared/contracts";
import { fetchPixelObjectLimits, usePixelObjectLimitsStore } from "./pixelObjectLimits";

describe("pixelObjectLimits store", () => {
  afterEach(() => {
    usePixelObjectLimitsStore.setState({
      limits: { ...DEFAULT_PIXEL_OBJECT_LIMITS },
      status: "idle",
      error: null,
    });
    vi.unstubAllGlobals();
  });

  it("parses GET /v1/tpg/pixel-objects/limits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...DEFAULT_PIXEL_OBJECT_LIMITS,
            canvasMax: 120,
          }),
          { status: 200 },
        ),
      ),
    );
    const limits = await fetchPixelObjectLimits();
    expect(limits.canvasMax).toBe(120);
    expect(limits.supportedFormat).toBe("twilite.pixelobject/v1");
  });

  it("keeps defaults when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "nope" }), { status: 401 })),
    );
    const limits = await usePixelObjectLimitsStore.getState().fetchLimits();
    expect(limits.canvasMax).toBe(DEFAULT_PIXEL_OBJECT_LIMITS.canvasMax);
    expect(usePixelObjectLimitsStore.getState().status).toBe("error");
  });
});
