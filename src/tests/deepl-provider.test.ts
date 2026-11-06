import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError, QuotaExceededError } from "@/server/errors";
import { DeepLProvider } from "@/server/providers/deepl.provider";
import type { TranslationInput } from "@/server/providers/translation-provider";

vi.mock("server-only", () => ({}));

const API_KEY = "test-secret-key";
const input: TranslationInput = {
  text: "Hola mundo",
  source: "ES",
  target: "EN-US",
};

function success(text = "Hello world", detectedSource = "ES") {
  return Response.json({
    translations: [
      { text, detected_source_language: detectedSource, billed_characters: 10 },
    ],
  });
}

describe("DeepLProvider", () => {
  let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;
  let provider: DeepLProvider;

  beforeEach(() => {
    vi.useFakeTimers();
    fetcher = vi.fn<typeof fetch>();
    provider = new DeepLProvider(API_KEY, fetcher);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("envía el contrato de DeepL Free con la clave solo en Authorization", async () => {
    fetcher.mockResolvedValueOnce(success());
    await expect(provider.translate(input)).resolves.toEqual({
      text: "Hello world",
      detectedSource: "ES",
    });
    expect(provider.name).toBe("deepl");
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api-free.deepl.com/v2/translate");
    expect(options).toMatchObject({
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${API_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      redirect: "error",
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(options?.body))).toEqual({
      text: ["Hola mundo"],
      source_lang: "ES",
      target_lang: "EN-US",
    });
    expect(String(url)).not.toContain(API_KEY);
    expect(String(options?.body)).not.toContain(API_KEY);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("omite source_lang para autodetección y conserva el texto traducido", async () => {
    fetcher.mockResolvedValueOnce(success("  Hello\nworld  ", "JA"));
    await expect(
      provider.translate({ text: "こんにちは", target: "EN-US" }),
    ).resolves.toEqual({
      text: "  Hello\nworld  ",
      detectedSource: "JA",
    });
    const [, options] = fetcher.mock.calls[0]!;
    expect(JSON.parse(String(options?.body))).toEqual({
      text: ["こんにちは"],
      target_lang: "EN-US",
    });
  });

  it.each([500, 502, 503, 504, 529, 599])(
    "reintenta HTTP %i una vez después del backoff",
    async (status) => {
      fetcher
        .mockResolvedValueOnce(new Response(null, { status }))
        .mockResolvedValueOnce(success());
      const result = provider.translate(input);
      await vi.advanceTimersByTimeAsync(299);
      expect(fetcher).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toEqual({
        text: "Hello world",
        detectedSource: "ES",
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(fetcher.mock.calls[0]?.[1]?.signal).not.toBe(
        fetcher.mock.calls[1]?.[1]?.signal,
      );
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("reintenta una caída de red y se recupera", async () => {
    fetcher
      .mockRejectedValueOnce(new TypeError("network private detail"))
      .mockResolvedValueOnce(success());
    const result = provider.translate(input);
    await vi.advanceTimersByTimeAsync(300);
    await expect(result).resolves.toEqual({
      text: "Hello world",
      detectedSource: "ES",
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each(["red", "5xx"])(
    "no supera dos intentos ante fallos de %s",
    async (kind) => {
      if (kind === "red")
        fetcher.mockRejectedValue(new Error(`private ${API_KEY}`));
      else
        fetcher.mockImplementation(
          async () => new Response("private detail", { status: 503 }),
        );
      const rejection = expect(provider.translate(input)).rejects.toMatchObject(
        {
          code: "PROVIDER_ERROR",
          message: new ProviderError().message,
        },
      );
      await vi.advanceTimersByTimeAsync(300);
      await rejection;
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(["cabeceras", "cuerpo"])(
    "cancela la espera de %s a los 8 segundos en cada intento",
    async (stage) => {
      const signals: AbortSignal[] = [];
      fetcher.mockImplementation(async (_url, options) => {
        const signal = options?.signal;
        if (!signal)
          throw new Error("La petición requiere señal de cancelación.");
        signals.push(signal);
        const waitForAbort = () =>
          new Promise<never>((_resolve, reject) => {
            signal.addEventListener(
              "abort",
              () => reject(new DOMException("aborted", "AbortError")),
              { once: true },
            );
          });
        if (stage === "cabeceras") return waitForAbort();
        const response = success();
        vi.spyOn(response, "json").mockImplementation(waitForAbort);
        return response;
      });
      const rejection = expect(
        provider.translate(input),
      ).rejects.toBeInstanceOf(ProviderError);
      await vi.advanceTimersByTimeAsync(7999);
      expect(signals[0]?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(signals[0]?.aborted).toBe(true);
      await vi.advanceTimersByTimeAsync(300);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(signals[1]?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(8000);
      await rejection;
      expect(signals[1]?.aborted).toBe(true);
      expect(signals[0]).not.toBe(signals[1]);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([429, 456])(
    "mapea HTTP %i a cuota sin reintentar",
    async (status) => {
      fetcher.mockResolvedValueOnce(
        new Response(`private ${API_KEY}`, { status }),
      );
      await expect(provider.translate(input)).rejects.toBeInstanceOf(
        QuotaExceededError,
      );
      expect(fetcher).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([302, 400, 401, 403, 404, 413])(
    "oculta el error HTTP %i sin reintentar",
    async (status) => {
      fetcher.mockResolvedValueOnce(
        new Response(`private ${API_KEY}`, { status }),
      );
      await expect(provider.translate(input)).rejects.toMatchObject({
        code: "PROVIDER_ERROR",
        httpStatus: 502,
        message: new ProviderError().message,
      });
      expect(fetcher).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("rechaza JSON mal formado sin reintentar", async () => {
    fetcher.mockResolvedValueOnce(new Response("{malformed", { status: 200 }));
    await expect(provider.translate(input)).rejects.toBeInstanceOf(
      ProviderError,
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([
    ["nula", null],
    ["sin translations", {}],
    ["lista vacía", { translations: [] }],
    [
      "más de un resultado",
      {
        translations: [
          { text: "Hello", detected_source_language: "ES" },
          { text: "Hello", detected_source_language: "ES" },
        ],
      },
    ],
    [
      "texto vacío",
      { translations: [{ text: "", detected_source_language: "ES" }] },
    ],
    [
      "texto numérico",
      { translations: [{ text: 1, detected_source_language: "ES" }] },
    ],
    ["sin idioma", { translations: [{ text: "Hello" }] }],
    [
      "idioma vacío",
      { translations: [{ text: "Hello", detected_source_language: " " }] },
    ],
  ])(
    "rechaza una respuesta %s sin filtrar su contenido",
    async (_label, body) => {
      fetcher.mockResolvedValueOnce(Response.json(body));
      await expect(provider.translate(input)).rejects.toMatchObject({
        code: "PROVIDER_ERROR",
        message: new ProviderError().message,
      });
      expect(fetcher).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("no permite iniciar el proveedor sin clave", () => {
    expect(() => new DeepLProvider(" ", fetcher)).toThrow(ProviderError);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
