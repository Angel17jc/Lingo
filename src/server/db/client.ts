import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export const DATABASE_QUERY_TIMEOUT_MS = 3000;
export type Database = NeonHttpDatabase<typeof schema>;

export function createDatabase(databaseUrl: string): Database {
  const client = neon(databaseUrl, {
    fetchOptions: {
      cache: "no-store",
      redirect: "error",
      // El driver copia estas opciones al iniciar cada fetch: señal nueva por consulta.
      get signal() {
        return AbortSignal.timeout(DATABASE_QUERY_TIMEOUT_MS);
      },
    },
  });
  return drizzle(client, { schema, logger: false });
}
