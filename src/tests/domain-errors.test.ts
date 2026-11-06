import { describe, expect, it } from "vitest";
import {
  DomainError,
  ProviderError,
  QuotaExceededError,
  RateLimitError,
  ValidationError,
} from "@/server/errors";

describe("errores de dominio", () => {
  it.each([
    { error: new ValidationError(), code: "VALIDATION_ERROR", status: 400 },
    { error: new RateLimitError(30), code: "RATE_LIMIT_EXCEEDED", status: 429 },
    { error: new ProviderError(), code: "PROVIDER_ERROR", status: 502 },
    { error: new QuotaExceededError(), code: "QUOTA_EXCEEDED", status: 503 },
  ])("expone $code con HTTP $status", ({ error, code, status }) => {
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe(code);
    expect(error.httpStatus).toBe(status);
    expect(error.name).toBe(error.constructor.name);
    expect(error.message.length).toBeGreaterThan(0);
  });

  it("conserva la espera necesaria para la futura cabecera Retry-After", () => {
    expect(new RateLimitError(45).retryAfterSeconds).toBe(45);
  });

  it.each([
    0,
    -1,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rechaza una espera inválida: %s", (seconds) => {
    expect(() => new RateLimitError(seconds)).toThrow(RangeError);
  });

  it("distingue errores del proveedor y cuota agotada del límite por usuario", () => {
    expect(new ProviderError()).not.toBeInstanceOf(RateLimitError);
    expect(new QuotaExceededError()).not.toBeInstanceOf(ProviderError);
    expect(new QuotaExceededError()).not.toBeInstanceOf(RateLimitError);
  });
});
