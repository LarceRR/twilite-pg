import { afterEach, describe, expect, it } from "vitest";

import { useSessionStore } from "./sessionStore";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "anna@twilite.dev",
  displayName: "Anna",
  avatarUrl: null,
  permissions: ["tpg.editor.view", "tpg.editor.createProject"],
  groups: [{ id: "artist", name: "Artist" }],
};

describe("session store", () => {
  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it("keeps only the public profile in memory", () => {
    useSessionStore.getState().setUser(user);

    expect(useSessionStore.getState().user).toEqual(user);
    expect(JSON.stringify(useSessionStore.getState())).not.toContain("accessToken");
    expect(JSON.stringify(useSessionStore.getState())).not.toContain("refreshToken");
  });

  it("clears the profile", () => {
    useSessionStore.getState().setUser(user);
    useSessionStore.getState().clear();

    expect(useSessionStore.getState().user).toBeNull();
  });
});
