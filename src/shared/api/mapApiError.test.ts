import { describe, expect, it } from "vitest";

import { ApiError } from "./http";
import { mapApiError, mapApiErrorMessage } from "./mapApiError";

describe("mapApiError", () => {
  it("maps stable codes to RU and appends requestId", () => {
    const error = new ApiError("raw storage boom", 422, {
      code: "MEDIA_SIZE_MISMATCH",
      message: "internal",
      requestId: "req-1",
    });
    expect(mapApiError(error)).toEqual({
      message: "Размер файла не совпал с заявленным. Загрузите spritesheet снова. (requestId: req-1)",
      code: "MEDIA_SIZE_MISMATCH",
      requestId: "req-1",
    });
  });

  it("does not echo storage URLs from free-form messages", () => {
    const error = new Error("PUT failed https://bucket.r2.cloudflarestorage.com/key?X-Amz-Signature=1");
    expect(mapApiErrorMessage(error, "fallback")).toBe("fallback");
  });

  it("maps self-moderation distinctly", () => {
    const error = new ApiError("forbidden", 403, {
      code: "PIXEL_OBJECT_SELF_MODERATION",
      requestId: "abc",
    });
    expect(mapApiErrorMessage(error)).toMatch(/собственн/i);
    expect(mapApiErrorMessage(error)).toContain("requestId: abc");
  });
});
