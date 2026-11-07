import "server-only";
import { getProvider } from "@/server/providers";
import { env } from "@/lib/env";
import { createDatabase, type Database } from "@/server/db/client";
import { createTranslationCache } from "@/server/cache/translation-cache";
import {
  createTranslationService,
  type TranslationService,
} from "./translation.service";

// Punto de composición: la lógica del servicio solo depende de interfaces.
let database: Database | undefined;

export function getTranslationService(): TranslationService {
  return createTranslationService({
    provider: getProvider(),
    // Se inicia dentro de get/set para que los fallos también degraden sin caché.
    cache: createTranslationCache(
      () => (database ??= createDatabase(env.DATABASE_URL)),
    ),
  });
}
