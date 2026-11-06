import { describe, expect, it } from "vitest";
import { readTranslationError } from "@/features/translator/client-errors";
import {
  sourceLanguageName,
  toSourceLanguage,
  toTargetLanguage,
} from "@/features/translator/language-utils";
import { messages } from "@/lib/messages";

describe("intercambio de idiomas", () => {
  it.each([
    ["EN-US", "EN"],
    ["EN-GB", "EN"],
    ["PT-BR", "PT"],
    ["PT-PT", "PT"],
    ["es", "ES"],
    ["FR", "FR"],
  ])("convierte %s al origen %s", (input, output) =>
    expect(toSourceLanguage(input)).toBe(output),
  );
  it.each([
    ["EN", "EN-US"],
    ["PT", "PT-BR"],
    ["ES", "ES"],
    ["FR", "FR"],
  ] as const)("convierte el origen %s al destino %s", (input, output) =>
    expect(toTargetLanguage(input)).toBe(output),
  );
  it("no inventa códigos para idiomas no soportados", () => {
    expect(toSourceLanguage("JA")).toBeUndefined();
    expect(sourceLanguageName("JA")).toBe("JA");
    expect(sourceLanguageName("ES")).toBe("Español");
  });
});

describe("errores seguros del cliente", () => {
  it("usa Retry-After antes que el cuerpo y nunca muestra mensajes externos", () => {
    const error = readTranslationError(
      429,
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "private-key",
          retryAfterSeconds: 99,
        },
      },
      "12",
    );
    expect(error.retryAfterSeconds).toBe(12);
    expect(error.message).toBe(messages.errors.rateLimit);
    expect(error.message).not.toContain("private-key");
  });
  it("entiende Retry-After como fecha HTTP", () => {
    const now = Date.UTC(2026, 10, 5, 12);
    expect(
      readTranslationError(429, null, new Date(now + 15000).toUTCString(), now)
        .retryAfterSeconds,
    ).toBe(15);
  });
  it("usa el cuerpo o una espera por defecto ante cabeceras inválidas", () => {
    expect(
      readTranslationError(
        429,
        { error: { code: "RATE_LIMIT_EXCEEDED", retryAfterSeconds: 8 } },
        "invalid",
      ).retryAfterSeconds,
    ).toBe(8);
    expect(readTranslationError(429, null, null).retryAfterSeconds).toBe(30);
  });
  it("limita esperas fuera de rango", () => {
    expect(readTranslationError(429, null, "0").retryAfterSeconds).toBe(1);
    expect(readTranslationError(429, null, "999999999").retryAfterSeconds).toBe(
      86400,
    );
  });
  it.each([
    [400, "validation"],
    [502, "provider"],
    [503, "quota"],
    [500, "unexpected"],
  ])("presenta un mensaje seguro para HTTP %i", (status, kind) => {
    const error = readTranslationError(
      Number(status),
      { error: { code: "UNKNOWN", message: "private-key" } },
      null,
    );
    expect(error.kind).toBe(kind);
    expect(error.message).not.toContain("private-key");
  });
});
