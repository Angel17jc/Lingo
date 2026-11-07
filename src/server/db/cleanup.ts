import { config } from "dotenv";
import { z } from "zod";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply") || args.length > 1) {
    throw new Error("Argumentos inválidos.");
  }
  config({ path: [".env.local", ".env"], quiet: true, override: false });
  const databaseUrl = z
    .url({ protocol: /^postgres(ql)?$/ })
    .safeParse(process.env.DATABASE_URL);
  if (!databaseUrl.success) throw new Error("DATABASE_URL inválida.");

  const [{ createDatabase }, { cleanupTranslationCache }] = await Promise.all([
    import("./client"),
    import("../cache/cleanup"),
  ]);
  const result = await cleanupTranslationCache(
    createDatabase(databaseUrl.data),
    {
      apply: args.includes("--apply"),
    },
  );
  console.info(JSON.stringify({ event: "cache.cleanup", ...result }));
}

main().catch(() => {
  console.error(
    "No se pudo completar la limpieza. Revisa DATABASE_URL, la conexión y la migración. Uso: pnpm db:cleanup [--apply].",
  );
  process.exitCode = 1;
});
