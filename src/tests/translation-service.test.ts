import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTranslationHash } from "@/lib/hash";
import { ProviderError, QuotaExceededError } from "@/server/errors";
import type { TranslationProvider } from "@/server/providers/translation-provider";
import { createTranslationService } from "@/server/services/translation.service";
import type {
  TranslationCache,
  TranslationCacheEntry,
} from "@/server/services/translation-cache";

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

describe("servicio con caché", () => {
  const input = { text: "Hola mundo", source: "ES", target: "EN-US" } as const;
  const result = { text: "Hello world", detectedSource: "ES" };
  const entry: TranslationCacheEntry = {
    hash: createTranslationHash(input, "deepl"),
    sourceText: input.text,
    source: input.source,
    target: input.target,
    translation: result.text,
    detectedSource: result.detectedSource,
    provider: "deepl",
  };
  const get = vi.fn<TranslationCache["get"]>();
  const set = vi.fn<TranslationCache["set"]>();
  const translate = vi.fn<TranslationProvider["translate"]>();
  const service = () =>
    createTranslationService({
      provider: { name: "deepl", translate },
      cache: { get, set },
    });

  beforeEach(() => {
    get.mockReset().mockResolvedValue(null);
    set.mockReset().mockResolvedValue(undefined);
    translate.mockReset().mockResolvedValue(result);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("un acierto devuelve el idioma detectado sin gastar cuota del proveedor", async () => {
    get.mockResolvedValue(entry);
    await expect(service().translate(input)).resolves.toEqual({
      translation: result.text,
      detectedSource: result.detectedSource,
      cached: true,
    });
    expect(get).toHaveBeenCalledExactlyOnceWith(entry.hash);
    expect(translate).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it("un miss consulta el proveedor y guarda su resultado después", async () => {
    await expect(service().translate(input)).resolves.toEqual({
      translation: result.text,
      detectedSource: "ES",
      cached: false,
    });
    expect(translate).toHaveBeenCalledExactlyOnceWith(input);
    expect(set).toHaveBeenCalledExactlyOnceWith(entry);
    expect(get.mock.invocationCallOrder[0]).toBeLessThan(
      translate.mock.invocationCallOrder[0]!,
    );
    expect(translate.mock.invocationCallOrder[0]).toBeLessThan(
      set.mock.invocationCallOrder[0]!,
    );
  });

  it("conserva autodetección e idiomas detectados fuera del catálogo", async () => {
    const autoInput = { text: "こんにちは", target: "ES" } as const;
    translate.mockResolvedValue({ text: "Hola", detectedSource: "JA" });
    await service().translate(autoInput);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ source: undefined, detectedSource: "JA" }),
    );
    get.mockResolvedValue(set.mock.calls[0]![0]);
    await expect(service().translate(autoInput)).resolves.toEqual({
      translation: "Hola",
      detectedSource: "JA",
      cached: true,
    });
    expect(translate).toHaveBeenCalledOnce();
  });

  it.each(["a".repeat(1000), "🌎".repeat(500)])(
    "cachea entradas de exactamente 1000 unidades UTF-16 (%#)",
    async (text) => {
      await service().translate({ ...input, text });
      expect(get).toHaveBeenCalledOnce();
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ sourceText: text }),
      );
    },
  );

  it.each(["a".repeat(1001), "🌎".repeat(501)])(
    "traduce sin consultar ni guardar entradas de más de 1000 unidades (%#)",
    async (text) => {
      await expect(
        service().translate({ ...input, text }),
      ).resolves.toMatchObject({
        cached: false,
      });
      expect(translate).toHaveBeenCalledOnce();
      expect(get).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
    },
  );

  it("una caída de lectura permite traducir y evita volver a esperar una escritura", async () => {
    get.mockRejectedValue(
      new Error("private-url private-text private-password"),
    );
    await expect(service().translate(input)).resolves.toMatchObject({
      cached: false,
    });
    expect(translate).toHaveBeenCalledOnce();
    expect(set).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledOnce();
    const [log] = vi.mocked(console.warn).mock.calls[0]!;
    expect(JSON.parse(String(log))).toMatchObject({
      level: "warn",
      event: "cache.unavailable",
    });
    expect(String(log)).not.toContain("private");
    expect(String(log)).not.toContain(input.text);
  });

  it("un fallo de inicialización de la base también permite traducir", async () => {
    get.mockImplementation(() => {
      throw new Error("private initialization");
    });
    await expect(service().translate(input)).resolves.toMatchObject({
      cached: false,
    });
    expect(translate).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it("un fallo de escritura preserva la traducción y registra solo un warning seguro", async () => {
    set.mockRejectedValue(
      new Error("private-url private-text private-password"),
    );
    await expect(service().translate(input)).resolves.toEqual({
      translation: result.text,
      detectedSource: "ES",
      cached: false,
    });
    expect(console.warn).toHaveBeenCalledOnce();
    expect(String(vi.mocked(console.warn).mock.calls[0]![0])).not.toContain(
      "private",
    );
  });

  it("un resultado de otro proveedor se trata como miss", async () => {
    get.mockResolvedValue({
      ...entry,
      provider: "azure",
      translation: "Other",
    });
    await expect(service().translate(input)).resolves.toMatchObject({
      translation: result.text,
      cached: false,
    });
    expect(translate).toHaveBeenCalledOnce();
  });

  it.each([new ProviderError(), new QuotaExceededError()])(
    "propaga $code y evita guardar errores del proveedor",
    async (error) => {
      translate.mockRejectedValue(error);
      await expect(service().translate(input)).rejects.toBe(error);
      expect(set).not.toHaveBeenCalled();
    },
  );
});
