import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";
import {
  ProviderError,
  QuotaExceededError,
  RateLimitError,
  ValidationError,
} from "@/server/errors";
import { translationErrorResponse } from "@/server/http/translation-error-response";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("respuestas de error de traducción", () => {
  it.each([
    { error: new ValidationError(), status: 400, code: "VALIDATION_ERROR" },
    { error: new ProviderError(), status: 502, code: "PROVIDER_ERROR" },
    { error: new QuotaExceededError(), status: 503, code: "QUOTA_EXCEEDED" },
  ])("mapea $code a HTTP $status", async ({ error, status, code }) => {
    const response = translationErrorResponse(error);
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Retry-After")).toBeNull();
    expect(await response.json()).toEqual({
      error: { code, message: error.message },
    });
    if (status >= 500) {
      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        "translation.failed",
        { status },
      );
    } else {
      expect(logger.error).not.toHaveBeenCalled();
    }
  });

  it("devuelve 429 con Retry-After y segundos de espera en el JSON", async () => {
    const error = new RateLimitError(45);
    const response = translationErrorResponse(error);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    expect(await response.json()).toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: error.message,
        retryAfterSeconds: 45,
      },
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each([
    new Error("private-key postgres://private-url user-text private-stack"),
    { message: "private-key", code: "FAKE", httpStatus: 401 },
    "private-key",
    null,
    undefined,
  ])("oculta un fallo inesperado: %j", async (error) => {
    const response = translationErrorResponse(error);
    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "No se pudo procesar la solicitud. Inténtalo más tarde.",
      },
    });
    expect(logger.error).toHaveBeenCalledExactlyOnceWith("translation.failed", {
      status: 500,
    });
  });
});
