import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { z } from "zod";
import baseConfig from "./drizzle.config";

// El entorno del proceso tiene prioridad; .env.local prevalece sobre .env.
config({ path: [".env.local", ".env"], quiet: true, override: false });

const databaseUrl = z
  .url({ protocol: /^postgres(ql)?$/ })
  .safeParse(process.env.DATABASE_URL);

if (!databaseUrl.success) {
  throw new Error(
    "Configuración inválida: revisa DATABASE_URL en .env.local antes de migrar.",
  );
}

export default defineConfig({
  ...baseConfig,
  dbCredentials: { url: databaseUrl.data },
});
