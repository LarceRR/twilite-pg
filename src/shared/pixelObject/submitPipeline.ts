import { apiFetch } from "@/shared/api/http";
import { mapApiErrorMessage } from "@/shared/api/mapApiError";
import type { SubmitTpoManifest } from "@/shared/pixelObject/manifest";

export type UploadTicket = {
  assetId: string;
  uploadUrl: string;
  headers: {
    "Content-Type": string;
    "Cache-Control": string;
  };
};

export type SubmitPipelinePhase =
  | "idle"
  | "ticket"
  | "uploaded"
  | "confirmed"
  | "submitted"
  | "failed";

export type SubmitPipelineState = {
  phase: SubmitPipelinePhase;
  sheetFingerprint: string;
  ticket: UploadTicket | null;
  mediaId: string | null;
  uploadKey: string;
  confirmKey: string;
  submitKey: string;
  lastError: string | null;
};

export type SubmitPipelineResult = {
  mediaId: string;
  object: unknown;
  state: SubmitPipelineState;
};

export type SubmitPipelineDeps = {
  createTicket: (byteSize: number, idempotencyKey: string) => Promise<UploadTicket>;
  putSheet: (ticket: UploadTicket, sheet: Blob) => Promise<void>;
  confirmUpload: (assetId: string, idempotencyKey: string) => Promise<void>;
  submitObject: (
    input: { title: string; manifest: SubmitTpoManifest },
    idempotencyKey: string,
  ) => Promise<unknown>;
  fingerprint: (sheet: Blob) => string;
};

export class SubmitPipelineError extends Error {
  readonly pipelineState: SubmitPipelineState;

  constructor(message: string, pipelineState: SubmitPipelineState) {
    super(message);
    this.name = "SubmitPipelineError";
    this.pipelineState = pipelineState;
  }
}

export function createInitialPipelineState(sheetFingerprint: string): SubmitPipelineState {
  return {
    phase: "idle",
    sheetFingerprint,
    ticket: null,
    mediaId: null,
    uploadKey: newIdempotencyKey(),
    confirmKey: newIdempotencyKey(),
    submitKey: newIdempotencyKey(),
    lastError: null,
  };
}

export function resetPipelineIfSheetChanged(
  state: SubmitPipelineState | null,
  sheetFingerprint: string,
): SubmitPipelineState {
  if (!state || state.sheetFingerprint !== sheetFingerprint) {
    return createInitialPipelineState(sheetFingerprint);
  }
  return state;
}

/**
 * Resumable upload → confirm → submit.
 * Retains ticket/mediaId; never submits after confirm failure; retries only safe steps.
 */
export async function runSubmitPipeline(input: {
  sheet: Blob;
  title: string;
  buildManifest: (mediaId: string) => SubmitTpoManifest;
  state: SubmitPipelineState;
  deps: SubmitPipelineDeps;
}): Promise<SubmitPipelineResult> {
  let state = resetPipelineIfSheetChanged(input.state, input.deps.fingerprint(input.sheet));
  state = { ...state, lastError: null };

  try {
    state = await ensureTicket(state, input.sheet, input.deps);
    state = await ensureUploaded(state, input.sheet, input.deps);
    state = await ensureConfirmed(state, input.deps);
    if (!state.mediaId) {
      throw new Error("Нет mediaId после confirm");
    }
    const mediaId = state.mediaId;
    const object = await input.deps.submitObject(
      { title: input.title, manifest: input.buildManifest(mediaId) },
      state.submitKey,
    );
    state = { ...state, phase: "submitted", lastError: null };
    return { mediaId, object, state };
  } catch (caught) {
    if (caught instanceof SubmitPipelineError) {
      throw caught;
    }
    const message = mapApiErrorMessage(caught, "Не удалось отправить объект.");
    throw new SubmitPipelineError(message, { ...state, phase: "failed", lastError: message });
  }
}

async function ensureTicket(
  state: SubmitPipelineState,
  sheet: Blob,
  deps: SubmitPipelineDeps,
): Promise<SubmitPipelineState> {
  if (state.ticket) {
    return state;
  }
  const ticket = await deps.createTicket(sheet.size, state.uploadKey);
  return { ...state, ticket, phase: "ticket" };
}

async function ensureUploaded(
  state: SubmitPipelineState,
  sheet: Blob,
  deps: SubmitPipelineDeps,
): Promise<SubmitPipelineState> {
  if (state.phase === "uploaded" || state.phase === "confirmed" || state.phase === "submitted") {
    return state;
  }
  if (!state.ticket) {
    throw new Error("Нет upload ticket");
  }
  await deps.putSheet(state.ticket, sheet);
  return { ...state, phase: "uploaded" };
}

async function ensureConfirmed(
  state: SubmitPipelineState,
  deps: SubmitPipelineDeps,
): Promise<SubmitPipelineState> {
  if (state.phase === "confirmed" || state.phase === "submitted") {
    return state;
  }
  if (!state.ticket || state.phase !== "uploaded") {
    throw new Error("Сначала загрузите spritesheet");
  }
  try {
    await deps.confirmUpload(state.ticket.assetId, state.confirmKey);
  } catch (caught) {
    const message = mapApiErrorMessage(caught, "Не удалось подтвердить загрузку.");
    // Stay on uploaded: callers must not submit without a confirmed asset.
    throw new SubmitPipelineError(message, {
      ...state,
      phase: "uploaded",
      mediaId: null,
      lastError: message,
    });
  }
  return {
    ...state,
    phase: "confirmed",
    mediaId: state.ticket.assetId,
    lastError: null,
  };
}

export function defaultSubmitPipelineDeps(options?: {
  resubmitId?: string | null;
}): SubmitPipelineDeps {
  return {
    fingerprint: (sheet) => `${sheet.size}:${sheet.type}`,
    createTicket: async (byteSize, idempotencyKey) => {
      const response = await apiFetch("/v1/media/uploads", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          kind: "pixel-sheet",
          contentType: "image/png",
          byteSize,
        }),
      });
      return response.json() as Promise<UploadTicket>;
    },
    putSheet: async (ticket, sheet) => {
      const upload = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": ticket.headers["Content-Type"],
          "Cache-Control": ticket.headers["Cache-Control"],
        },
        body: sheet,
      });
      if (!upload.ok) {
        throw new Error(`Не удалось загрузить spritesheet (${upload.status})`);
      }
    },
    confirmUpload: async (assetId, idempotencyKey) => {
      await apiFetch(`/v1/media/uploads/${assetId}/confirm`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
      });
    },
    submitObject: async (body, idempotencyKey) => {
      const resubmitId = options?.resubmitId;
      const response = await apiFetch(
        resubmitId ? `/v1/tpg/pixel-objects/${resubmitId}` : "/v1/tpg/pixel-objects",
        {
          method: resubmitId ? "PATCH" : "POST",
          headers: { "Idempotency-Key": idempotencyKey },
          body: JSON.stringify(body),
        },
      );
      return response.json();
    },
  };
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ikey-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
