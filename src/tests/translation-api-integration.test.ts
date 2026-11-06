import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/translate/route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: { TRANSLATION_PROVIDER: "deepl", DEEPL_API_KEY: "test-private-key" },
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;

function request() {
  return new Request("http://localhost/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "  Hola mundo  ", target: "EN-US" }),
  });
}

beforeEach(() => {
  fetcher = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetcher);
});

afterEach(() => vi.unstubAllGlobals());

describe("API → servicio → DeepL simulado", () => {
  it("conecta las capas y convierte el contrato externo al público", async () => {
    fetcher.mockResolvedValueOnce(
      Response.json({
        translations: [{ text: "Hello world", detected_source_language: "ES" }],
      }),
    );
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      translation: "Hello world",
      detectedSource: "ES",
      cached: false,
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api-free.deepl.com/v2/translate");
    expect(new Headers(options?.headers).get("Authorization")).toBe(
      "DeepL-Auth-Key test-private-key",
    );
    expect(JSON.parse(String(options?.body))).toEqual({
      text: ["Hola mundo"],
      target_lang: "EN-US",
    });
  });

  it("una clave rechazada produce 502 sin filtrar el cuerpo de DeepL", async () => {
    fetcher.mockResolvedValueOnce(
      Response.json(
        {
          message: "test-private-key postgres://private-url private-stack",
        },
        { status: 403 },
      ),
    );
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: {
        code: "PROVIDER_ERROR",
        message: "No se pudo completar la traducción. Inténtalo más tarde.",
      },
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([429, 456])(
    "DeepL HTTP %i produce el error público de cuota",
    async (status) => {
      fetcher.mockResolvedValueOnce(
        new Response("private provider detail", { status }),
      );
      const response = await POST(request());
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: { code: "QUOTA_EXCEEDED" },
      });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it("una entrada vacía no alcanza el proveedor", async () => {
    const response = await POST(
      new Request("http://localhost/api/translate", {
        method: "POST",
        body: JSON.stringify({ text: "", target: "EN-US" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
