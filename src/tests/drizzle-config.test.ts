import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Las pruebas de configuración nunca cargan los archivos locales del usuario.
vi.mock("dotenv", () => ({ config: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", undefined);
  vi.stubEnv("DEEPL_API_KEY", undefined);
  vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);
});

afterEach(() => vi.unstubAllEnvs());

describe("configuración de migraciones", () => {
  it("permite generar y comprobar SQL sin credenciales", async () => {
    const { default: config } = await import("../../drizzle.config");
    expect(config.dialect).toBe("postgresql");
    expect(config).not.toHaveProperty("dbCredentials");
  });

  it.each(["postgresql", "postgres"])(
    "acepta %s sin requerir los servicios de traducción o Redis",
    async (protocol) => {
      const url = `${protocol}://test:private-password@localhost:5432/lingo`;
      vi.stubEnv("DATABASE_URL", url);
      const { default: config } = await import("../../drizzle.migrate.config");
      expect(config).toHaveProperty("dbCredentials", { url });
    },
  );

  it.each([undefined, "", "private-invalid-url", "https://private-host/db"])(
    "rechaza DATABASE_URL inválida con un mensaje seguro (%s)",
    async (url) => {
      vi.stubEnv("DATABASE_URL", url);
      await expect(import("../../drizzle.migrate.config")).rejects.toThrow(
        /^Configuración inválida: revisa DATABASE_URL en \.env\.local antes de migrar\.$/u,
      );
    },
  );
});
