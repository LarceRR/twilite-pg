import { create } from "zustand";

import { apiFetch } from "@/shared/api/http";
import {
  DEFAULT_PIXEL_OBJECT_LIMITS,
  type PixelObjectLimits,
} from "@/shared/contracts";
import { toast } from "@/shared/ui/Toast";

type LimitsState = {
  limits: PixelObjectLimits;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  fetchLimits: () => Promise<PixelObjectLimits>;
};

function parseLimits(raw: unknown): PixelObjectLimits {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_PIXEL_OBJECT_LIMITS };
  }
  const body = raw as Partial<PixelObjectLimits>;
  return {
    canvasMax: positiveInt(body.canvasMax, DEFAULT_PIXEL_OBJECT_LIMITS.canvasMax),
    maxFrames: positiveInt(body.maxFrames, DEFAULT_PIXEL_OBJECT_LIMITS.maxFrames),
    sheetMaxBytes: positiveInt(body.sheetMaxBytes, DEFAULT_PIXEL_OBJECT_LIMITS.sheetMaxBytes),
    minFrameDurationMs: positiveInt(
      body.minFrameDurationMs,
      DEFAULT_PIXEL_OBJECT_LIMITS.minFrameDurationMs,
    ),
    maxFrameDurationMs: positiveInt(
      body.maxFrameDurationMs,
      DEFAULT_PIXEL_OBJECT_LIMITS.maxFrameDurationMs,
    ),
    titleMax: positiveInt(body.titleMax, DEFAULT_PIXEL_OBJECT_LIMITS.titleMax),
    surfaceMax: positiveInt(body.surfaceMax, DEFAULT_PIXEL_OBJECT_LIMITS.surfaceMax),
    objectsPerProject: positiveInt(
      body.objectsPerProject,
      DEFAULT_PIXEL_OBJECT_LIMITS.objectsPerProject,
    ),
    projectsPerUser: positiveInt(
      body.projectsPerUser,
      DEFAULT_PIXEL_OBJECT_LIMITS.projectsPerUser,
    ),
    projectTitleMax: positiveInt(
      body.projectTitleMax,
      DEFAULT_PIXEL_OBJECT_LIMITS.projectTitleMax,
    ),
    supportedFormat: DEFAULT_PIXEL_OBJECT_LIMITS.supportedFormat,
  };
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

export async function fetchPixelObjectLimits(): Promise<PixelObjectLimits> {
  const response = await apiFetch("/v1/tpg/pixel-objects/limits");
  return parseLimits(await response.json());
}

export const usePixelObjectLimitsStore = create<LimitsState>((set, get) => ({
  limits: { ...DEFAULT_PIXEL_OBJECT_LIMITS },
  status: "idle",
  error: null,
  fetchLimits: async () => {
    if (get().status === "loading") {
      return get().limits;
    }
    set({ status: "loading", error: null });
    try {
      const limits = await fetchPixelObjectLimits();
      set({ limits, status: "ready", error: null });
      return limits;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Не удалось загрузить лимиты";
      set({ status: "error", error: message });
      toast.error(message);
      return get().limits;
    }
  },
}));
