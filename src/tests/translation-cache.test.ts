import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase, DATABASE_QUERY_TIMEOUT_MS } from "@/server/db/client";
import { createTranslationCache } from "@/server/cache/translation-cache";
import { cleanupTranslationCache } from "@/server/cache/cleanup";
import type { TranslationCacheEntry } from "@/server/services/translation-cache";

vi.mock("server-only", () => ({}));

const databaseUrl =
  "postgresql://test:test@ep-test-pooler.us-east-2.aws.neon.tech/lingo?sslmode=require";
const entry: TranslationCacheEntry = {
  hash: "a".repeat(64),
  sourceText: "Hola mundo",
  source: "ES",
  target: "EN-US",
  translation: "Hello world",
  detectedSource: "ES",
  provider: "deepl",
};
const columns = [
  "hash",
  "source_text",
  "source_lang",
  "target_lang",
  "translated_text",
  "detected_source",
  "provider",
];
const row = [
  entry.hash,
  entry.sourceText,
  "ES",
  "EN-US",
  "Hello world",
  "ES",
  "deepl",
];
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;

function response(
  rows: (string | null)[][] = [],
  fields = columns,
  command = "UPDATE",
  rowCount = rows.length,
) {
  return Response.json({
    fields: fields.map((name) => ({ name, dataTypeID: 25 })),
    rows,
    command,
    rowCount,
  });
}

function queryAt(index = 0): { query: string; params: unknown[] } {
  return JSON.parse(String(fetcher.mock.calls[index]![1]?.body));
}

beforeEach(() => {
  fetcher = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("adaptador Neon con Drizzle real y red simulada", () => {
  const cache = () => createTranslationCache(() => createDatabase(databaseUrl));

  it("devuelve una entrada y actualiza hits y last_used_at con una sola consulta", async () => {
    fetcher.mockResolvedValue(response([row]));
    await expect(cache().get(entry.hash)).resolves.toEqual(entry);
    expect(fetcher).toHaveBeenCalledOnce();
    const query = queryAt();
    expect(query.query).toMatch(/update "translation_cache"/u);
    expect(query.query).toContain('"hits" = "translation_cache"."hits" + 1');
    expect(query.query).toContain('"last_used_at" = now()');
    expect(query.query).toMatch(/where .+"hash" = \$1 returning/u);
    expect(query.params).toEqual([entry.hash]);
  });

  it("un miss devuelve null", async () => {
    fetcher.mockResolvedValue(response());
    await expect(cache().get(entry.hash)).resolves.toBeNull();
  });

  it("reconstruye autodetección y mantiene el idioma detectado", async () => {
    fetcher.mockResolvedValue(
      response([[entry.hash, "こんにちは", null, "ES", "Hola", "JA", "deepl"]]),
    );
    await expect(cache().get(entry.hash)).resolves.toMatchObject({
      source: undefined,
      target: "ES",
      translation: "Hola",
      detectedSource: "JA",
    });
  });

  it.each([
    [entry.hash, "Hola", "XX", "EN-US", "Hello", "ES", "deepl"],
    [entry.hash, "Hola", "ES", "EN-US", "", "ES", "deepl"],
    [entry.hash, "Hola", "ES", "XX", "Hello", "ES", "deepl"],
  ])("rechaza una fila dañada (%#)", async (...invalidRow) => {
    fetcher.mockResolvedValue(response([invalidRow]));
    await expect(cache().get(entry.hash)).rejects.toBeInstanceOf(Error);
  });

  it("guarda con parámetros y resuelve colisiones sin sobrescribir la fila existente", async () => {
    fetcher.mockResolvedValue(response([], [], "INSERT"));
    const sourceText = "'; DROP TABLE translation_cache; --";
    await cache().set({ ...entry, source: undefined, sourceText });
    const query = queryAt();
    expect(query.query).toContain('on conflict ("hash") do nothing');
    expect(query.query).not.toContain(sourceText);
    expect(query.params).toContain(sourceText);
    expect(query.params).toContain(null);
    expect(query.params).toContain(entry.translation);
    expect(query.params).toContain(entry.detectedSource);
  });

  it("es idempotente si dos escrituras del mismo hash llegan a la vez", async () => {
    fetcher.mockImplementation(async () => response([], [], "INSERT"));
    const adapter = cache();
    await expect(
      Promise.all([adapter.set(entry), adapter.set(entry)]),
    ).resolves.toEqual([undefined, undefined]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(queryAt().query).toContain('on conflict ("hash") do nothing');
    expect(queryAt(1).params).toEqual(queryAt().params);
  });

  it.each(["a".repeat(1001), "🌎".repeat(501), ""])(
    "evita iniciar la base para una escritura fuera del límite (%#)",
    async (sourceText) => {
      const getDatabase = vi.fn(() => createDatabase(databaseUrl));
      await createTranslationCache(getDatabase).set({ ...entry, sourceText });
      expect(getDatabase).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("acepta exactamente 1000 unidades de entrada aunque el resultado sea más largo", async () => {
    fetcher.mockResolvedValue(response([], [], "INSERT"));
    await cache().set({
      ...entry,
      sourceText: "a".repeat(1000),
      translation: "b".repeat(1500),
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each(["get", "set"] as const)(
    "propaga los fallos de %s para que el servicio degrade",
    async (operation) => {
      fetcher.mockResolvedValue(
        new Response("private database details", { status: 500 }),
      );
      const adapter = cache();
      await expect(
        operation === "get" ? adapter.get(entry.hash) : adapter.set(entry),
      ).rejects.toBeInstanceOf(Error);
    },
  );
});

describe("cliente Neon", () => {
  it("crea una señal nueva por consulta y desactiva caché y redirecciones HTTP", async () => {
    fetcher.mockImplementation(async () => response());
    const database = createDatabase(databaseUrl);
    const adapter = createTranslationCache(() => database);
    expect(fetcher).not.toHaveBeenCalled();
    await adapter.get(entry.hash);
    await adapter.get(entry.hash);
    const firstOptions = fetcher.mock.calls[0]![1]!;
    const secondOptions = fetcher.mock.calls[1]![1]!;
    expect(firstOptions).toMatchObject({
      cache: "no-store",
      redirect: "error",
    });
    expect(firstOptions.signal).toBeInstanceOf(AbortSignal);
    expect(secondOptions.signal).not.toBe(firstOptions.signal);
  });

  it("una señal de timeout cancela la consulta y permite manejar el fallo", async () => {
    const controller = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(controller.signal);
    fetcher.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options!.signal!.addEventListener(
            "abort",
            () => reject(options!.signal!.reason),
            { once: true },
          );
        }),
    );
    const adapter = createTranslationCache(() => createDatabase(databaseUrl));
    const rejected = expect(adapter.get(entry.hash)).rejects.toBeInstanceOf(
      Error,
    );
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    expect(timeout).toHaveBeenCalledWith(DATABASE_QUERY_TIMEOUT_MS);
    controller.abort(new DOMException("Timeout", "TimeoutError"));
    await rejected;
  });
});

describe("limpieza de caché", () => {
  it("por defecto cuenta sin borrar y usa last_used_at y un umbral estricto de 90 días", async () => {
    fetcher.mockResolvedValue(response([["7"]], ["entries"], "SELECT"));
    const result = await cleanupTranslationCache(createDatabase(databaseUrl));
    expect(result).toEqual({ apply: false, entries: 7, retentionDays: 90 });
    const query = queryAt();
    expect(query.query).toMatch(/^select count\(\*\)/u);
    expect(query.query).toContain(
      "\"last_used_at\" < now() - $1 * interval '1 day'",
    );
    expect(query.params).toEqual(["90"]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("solo aplica el borrado al pedir apply y devuelve el número sin traer textos", async () => {
    fetcher.mockResolvedValue(response([], [], "DELETE", 4));
    const result = await cleanupTranslationCache(createDatabase(databaseUrl), {
      apply: true,
    });
    expect(result).toEqual({ apply: true, entries: 4, retentionDays: 90 });
    expect(queryAt().query).toMatch(/^delete from "translation_cache" where/u);
    expect(queryAt().query).not.toContain("returning");
    expect(queryAt().params).toEqual(["90"]);
  });

  it("propaga errores de limpieza al comando", async () => {
    fetcher.mockRejectedValue(new Error("private database error"));
    await expect(
      cleanupTranslationCache(createDatabase(databaseUrl)),
    ).rejects.toBeInstanceOf(Error);
  });
});
