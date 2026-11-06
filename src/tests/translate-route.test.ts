import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/translate/route";
import { ProviderError, RateLimitError } from "@/server/errors";
import { getTranslationService } from "@/server/services";
import type { TranslationService } from "@/server/services/translation.service";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/server/services", () => ({ getTranslationService: vi.fn() }));

const translate = vi.fn<TranslationService["translate"]>();

function request(body: unknown) {
  return new Request("http://localhost/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  translate.mockReset();
  vi.mocked(getTranslationService).mockReset().mockReturnValue({ translate });
});

describe("POST /api/translate", () => {
  it("valida y normaliza la entrada antes de llamar al servicio", async () => {
    translate.mockResolvedValue({
      translation: "Hello",
      detectedSource: "ES",
      cached: false,
    });
    const response = await POST(
      request({ text: "  Hola  ", source: "ES", target: "EN-US" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(await response.json()).toEqual({
      translation: "Hello",
      detectedSource: "ES",
      cached: false,
    });
    expect(getTranslationService).toHaveBeenCalledOnce();
    expect(translate).toHaveBeenCalledExactlyOnceWith({
      text: "Hola",
      source: "ES",
      target: "EN-US",
    });
  });

  it("permite omitir source para autodetección", async () => {
    translate.mockResolvedValue({
      translation: "Hello",
      detectedSource: "ES",
      cached: false,
    });
    await POST(request({ text: "Hola", target: "EN-US" }));
    expect(translate).toHaveBeenCalledExactlyOnceWith({
      text: "Hola",
      target: "EN-US",
    });
  });

  it("rechaza JSON mal formado sin componer el servicio", async () => {
    const response = await POST(
      new Request("http://localhost/api/translate", {
        method: "POST",
        body: "{invalid",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(getTranslationService).not.toHaveBeenCalled();
    expect(translate).not.toHaveBeenCalled();
  });

  it.each([
    { text: " ", target: "EN-US" },
    { text: "a".repeat(3001), target: "EN-US" },
    { text: "Hola", target: "XX" },
    { text: "Hola", source: "EN-US", target: "ES" },
    { text: "Hola", target: "ES", apiKey: "private-key" },
    null,
  ])(
    "rechaza una solicitud inválida sin componer el servicio",
    async (body) => {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Los datos de traducción no son válidos.",
        },
      });
      expect(getTranslationService).not.toHaveBeenCalled();
      expect(translate).not.toHaveBeenCalled();
    },
  );

  it("devuelve los errores de proveedor sin detalles internos", async () => {
    translate.mockRejectedValue(new ProviderError());
    const response = await POST(request({ text: "Hola", target: "EN-US" }));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      error: { code: "PROVIDER_ERROR" },
    });
  });

  it("conserva Retry-After cuando el servicio devuelve un límite", async () => {
    translate.mockRejectedValue(new RateLimitError(20));
    const response = await POST(request({ text: "Hola", target: "EN-US" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("20");
    expect(await response.json()).toMatchObject({
      error: { retryAfterSeconds: 20 },
    });
  });

  it("oculta fallos inesperados al componer el servicio", async () => {
    vi.mocked(getTranslationService).mockImplementation(() => {
      throw new Error("private-key private-url private-stack");
    });
    const response = await POST(request({ text: "Hola", target: "EN-US" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: { code: "INTERNAL_ERROR" },
    });
    expect(translate).not.toHaveBeenCalled();
  });
});
