import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch, registerSessionRefresh } from "./http";

describe("apiFetch auth", () => {
  afterEach(() => {
    registerSessionRefresh(null);
    vi.unstubAllGlobals();
  });

  it("sends cookies and never attaches a bearer token from JS", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/v1/users/me");

    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.credentials).toBe("include");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBeNull();
  });

  it("refreshes once on 401 and retries the original request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "expired" }), { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const refresh = vi.fn().mockResolvedValue(true);
    registerSessionRefresh(refresh);

    await apiFetch("/v1/users/me");

    expect(refresh).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).credentials).toBe("include");
  });

  it("does not recurse when refresh itself returns 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/v1/auth/refresh", { method: "POST", body: "{}" })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
