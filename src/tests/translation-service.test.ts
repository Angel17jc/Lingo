import { describe, expect, it, vi } from "vitest";
import { ProviderError, QuotaExceededError } from "@/server/errors";
import type { TranslationProvider } from "@/server/providers/translation-provider";
import { createTranslationService } from "@/server/services/translation.service";

vi.mock("server-only", () => ({}));

describe("servicio de traducción", () => {
  it("invoca el proveedor inyectado y devuelve el contrato público sin caché", async () => {
    const translate = vi
      .fn<TranslationProvider["translate"]>()
      .mockResolvedValue({
        text: "  Hello\nworld  ",
        detectedSource: "ES",
      });
    const service = createTranslationService({
      provider: { name: "mock", translate },
    });
    const input = {
      text: "Hola mundo",
      source: "ES",
      target: "EN-US",
    } as const;
    await expect(service.translate(input)).resolves.toEqual({
      translation: "  Hello\nworld  ",
      detectedSource: "ES",
      cached: false,
    });
    expect(translate).toHaveBeenCalledExactlyOnceWith(input);
  });

  it("preserva la omisión de origen para autodetección", async () => {
    const translate = vi
      .fn<TranslationProvider["translate"]>()
      .mockResolvedValue({
        text: "Hola",
        detectedSource: "JA",
      });
    const service = createTranslationService({
      provider: { name: "mock", translate },
    });
    await expect(
      service.translate({ text: "こんにちは", target: "ES" }),
    ).resolves.toMatchObject({
      detectedSource: "JA",
      cached: false,
    });
    expect(translate).toHaveBeenCalledExactlyOnceWith({
      text: "こんにちは",
      target: "ES",
    });
  });

  it.each([new ProviderError(), new QuotaExceededError()])(
    "propaga $code para que el controlador lo mapee",
    async (error) => {
      const translate = vi
        .fn<TranslationProvider["translate"]>()
        .mockRejectedValue(error);
      const service = createTranslationService({
        provider: { name: "mock", translate },
      });
      await expect(
        service.translate({ text: "Hola", target: "EN-US" }),
      ).rejects.toBe(error);
      expect(translate).toHaveBeenCalledOnce();
    },
  );
});
