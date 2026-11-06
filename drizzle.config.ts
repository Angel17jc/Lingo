import { defineConfig } from "drizzle-kit";

// Generar y comprobar SQL no requiere variables de entorno ni conexión.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
});
