import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const validEnv = {
  TRANSLATION_PROVIDER: "deepl",
  DEEPL_API_KEY: "test-key-do-not-log",
  DATABASE_URL: "postgresql://user:password@localhost:5432/lingo",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-token-do-not-log",
} as const;

beforeEach(() => {
  vi.resetModules();
  for (const [key, value] of Object.entries(validEnv)) {
    vi.stubEnv(key, value);
  }
});

afterEach(() => vi.unstubAllEnvs());

describe("configuración de servidor", () => {
  it("acepta una configuración completa", async () => {
    const { env } = await import("@/lib/env");
    expect(env).toEqual(validEnv);
  });

  it("usa DeepL si no se indica proveedor", async () => {
    vi.stubEnv("TRANSLATION_PROVIDER", undefined);
    const { env } = await import("@/lib/env");
    expect(env.TRANSLATION_PROVIDER).toBe("deepl");
  });

  it("acepta el protocolo postgres", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://user:password@localhost/lingo");
    await expect(import("@/lib/env")).resolves.toBeDefined();
  });

  it.each([
    ["DATABASE_URL", "invalid-db-with-private-value"],
    ["DATABASE_URL", ""],
    ["DATABASE_URL", "https://example.com/private-value"],
    ["UPSTASH_REDIS_REST_URL", "invalid-redis-with-private-value"],
    ["UPSTASH_REDIS_REST_URL", ""],
    ["UPSTASH_REDIS_REST_URL", "http://example.com/private-value"],
    ["TRANSLATION_PROVIDER", "unknown-provider-private-value"],
  ])("rechaza %s inválida con un mensaje seguro (%s)", async (key, value) => {
    vi.stubEnv(key, value);
    let failure: unknown;
    try {
      await import("@/lib/env");
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    const message = (failure as Error).message;
    expect(message).toContain("Configuración inválida");
    expect(message).toContain(key);
    if (value) expect(message).not.toContain(value);
    expect(message).not.toContain(validEnv.DEEPL_API_KEY);
    expect(message).not.toContain(validEnv.UPSTASH_REDIS_REST_TOKEN);
    expect(message).not.toContain(validEnv.DATABASE_URL);
  });

  it.each([
    "DEEPL_API_KEY",
    "DATABASE_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ])("identifica la variable ausente %s", async (key) => {
    vi.stubEnv(key, undefined);
    await expect(import("@/lib/env")).rejects.toThrow(
      `Configuración inválida: revisa ${key} en .env.local.`,
    );
  });
});
