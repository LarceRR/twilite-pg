import { afterEach, describe, expect, it } from "vitest";

import {
  CONTRACT_ERROR_CODES,
  DEFAULT_PIXEL_OBJECT_LIMITS,
  isContractErrorCode,
} from "./index";

describe("shared contracts pin", () => {
  afterEach(() => {
    // no globals
  });

  it("exposes the full stable error registry", () => {
    expect(CONTRACT_ERROR_CODES).toContain("STORAGE_UNAVAILABLE");
    expect(CONTRACT_ERROR_CODES).toContain("PIXEL_OBJECT_SELF_MODERATION");
    expect(isContractErrorCode("MEDIA_SIZE_MISMATCH")).toBe(true);
    expect(isContractErrorCode("R2_KEY_LEAK")).toBe(false);
  });

  it("matches default canvasMax 160 and sheet 8 MiB", () => {
    expect(DEFAULT_PIXEL_OBJECT_LIMITS.canvasMax).toBe(160);
    expect(DEFAULT_PIXEL_OBJECT_LIMITS.sheetMaxBytes).toBe(8 * 1024 * 1024);
    expect(DEFAULT_PIXEL_OBJECT_LIMITS.supportedFormat).toBe("twilite.pixelobject/v1");
  });
});
