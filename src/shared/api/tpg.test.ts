import { afterEach, describe, expect, it, vi } from "vitest";
import { TPG_PERMISSIONS } from "@/shared/lib/rbac";
import { useSessionStore } from "@/shared/store/session";
import {
  ALGORITHM_LABELS,
  PIXEL_ART_ALGORITHMS,
  downloadNativePixelArt,
  downloadPixelArt,
  pixelateFromFile,
  toDataUrl,
  toNativeDataUrl,
  type PixelateResult,
} from "@/shared/api/tpg";

const sample: PixelateResult = {
  mimeType: "image/png",
  width: 400,
  height: 300,
  imageBase64: "aGVsbG8=",
  nativeWidth: 50,
  nativeHeight: 37,
  nativeBase64: "dGlueQ==",
  pixelSize: 8,
  paletteSize: 24,
  algorithm: "quantize",
};

describe("tpg api helpers", () => {
  it("lists all algorithms with labels", () => {
    expect(PIXEL_ART_ALGORITHMS.length).toBeGreaterThanOrEqual(6);
    for (const id of PIXEL_ART_ALGORITHMS) {
      expect(ALGORITHM_LABELS[id].length).toBeGreaterThan(0);
    }
  });

  it("builds preview and native data URLs", () => {
    expect(toDataUrl(sample)).toBe("data:image/png;base64,aGVsbG8=");
    expect(toNativeDataUrl(sample)).toBe("data:image/png;base64,dGlueQ==");
  });

  it("triggers downloads", () => {
    const click = vi.fn();
    const createElement = vi.spyOn(document, "createElement").mockReturnValue({
      click,
      href: "",
      download: "",
    } as unknown as HTMLAnchorElement);

    downloadPixelArt(sample);
    downloadNativePixelArt(sample);

    expect(createElement).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(2);
    createElement.mockRestore();
  });
});

describe("pixelateFromFile", () => {
  afterEach(() => {
    useSessionStore.getState().clear();
    vi.unstubAllGlobals();
  });

  it("rejects the call when PIXELATE_USE is missing", async () => {
    useSessionStore.getState().setUser({
      id: "user",
      email: "a@b.c",
      displayName: "Maku",
      avatarUrl: null,
      permissions: [],
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      pixelateFromFile(new File(["x"], "a.png", { type: "image/png" })),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the abort signal with the upload", async () => {
    useSessionStore.getState().setUser({
      id: "user",
      email: "a@b.c",
      displayName: "Maku",
      avatarUrl: null,
      permissions: [TPG_PERMISSIONS.PIXELATE_USE],
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await pixelateFromFile(new File(["x"], "a.png", { type: "image/png" }), {
      pixelSize: 4,
      signal: controller.signal,
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
    expect((init.body as FormData).get("pixelSize")).toBe("4");
  });
});
