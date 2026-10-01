import { describe, expect, it, vi } from "vitest";

import type { SubmitTpoManifest } from "./manifest";
import {
  createInitialPipelineState,
  resetPipelineIfSheetChanged,
  runSubmitPipeline,
  SubmitPipelineError,
  type SubmitPipelineDeps,
  type UploadTicket,
} from "./submitPipeline";

const ticket: UploadTicket = {
  assetId: "11111111-1111-4111-8111-111111111111",
  uploadUrl: "https://example.test/put",
  headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=1" },
};

function manifest(_mediaId: string): SubmitTpoManifest {
  return {
    format: "twilite.pixelobject/v1",
    canvas: { width: 8, height: 8 },
    sheet: {
      mediaId: _mediaId,
      frameWidth: 8,
      frameHeight: 8,
      columns: 1,
      rows: 1,
      frameCount: 1,
    },
    animations: [{ id: "default", loop: true, frames: [{ frame: 0, durationMs: 100 }] }],
    staticPreviewFrame: 0,
  };
}

function mockDeps(overrides: Partial<SubmitPipelineDeps> = {}): SubmitPipelineDeps {
  return {
    fingerprint: (sheet) => `${sheet.size}`,
    createTicket: vi.fn().mockResolvedValue(ticket),
    putSheet: vi.fn().mockResolvedValue(undefined),
    confirmUpload: vi.fn().mockResolvedValue(undefined),
    submitObject: vi.fn().mockResolvedValue({ id: "obj" }),
    ...overrides,
  };
}

describe("runSubmitPipeline", () => {
  it("runs ticket → upload → confirm → submit with idempotency keys", async () => {
    const deps = mockDeps();
    const sheet = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const result = await runSubmitPipeline({
      sheet,
      title: "lamp",
      buildManifest: manifest,
      state: createInitialPipelineState("3"),
      deps,
    });
    expect(result.state.phase).toBe("submitted");
    expect(deps.createTicket).toHaveBeenCalledWith(3, expect.any(String));
    expect(deps.confirmUpload).toHaveBeenCalledWith(ticket.assetId, expect.any(String));
    expect(deps.submitObject).toHaveBeenCalledOnce();
  });

  it("never submits when confirm fails and keeps uploaded state for retry", async () => {
    const deps = mockDeps({
      confirmUpload: vi.fn().mockRejectedValue(new Error("confirm broke")),
    });
    const sheet = new Blob([new Uint8Array([1])], { type: "image/png" });
    const state = createInitialPipelineState("1");
    await expect(
      runSubmitPipeline({
        sheet,
        title: "lamp",
        buildManifest: manifest,
        state,
        deps,
      }),
    ).rejects.toBeInstanceOf(SubmitPipelineError);
    expect(deps.submitObject).not.toHaveBeenCalled();
  });

  it("retries only remaining safe steps when ticket already exists", async () => {
    const deps = mockDeps();
    const sheet = new Blob([new Uint8Array([9, 9])], { type: "image/png" });
    const prior = {
      ...createInitialPipelineState("2"),
      phase: "uploaded" as const,
      ticket,
    };
    await runSubmitPipeline({
      sheet,
      title: "lamp",
      buildManifest: manifest,
      state: prior,
      deps,
    });
    expect(deps.createTicket).not.toHaveBeenCalled();
    expect(deps.putSheet).not.toHaveBeenCalled();
    expect(deps.confirmUpload).toHaveBeenCalledOnce();
    expect(deps.submitObject).toHaveBeenCalledOnce();
  });

  it("resets keys when the sheet fingerprint changes", () => {
    const prior = createInitialPipelineState("old");
    const next = resetPipelineIfSheetChanged(prior, "new");
    expect(next.sheetFingerprint).toBe("new");
    expect(next.ticket).toBeNull();
    expect(next.uploadKey).not.toBe(prior.uploadKey);
  });
});
