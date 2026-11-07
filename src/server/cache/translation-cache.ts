import "server-only";
import { eq, sql } from "drizzle-orm";
import {
  translateRequestSchema,
  translateResponseSchema,
} from "@/features/translator/schemas";
import type { Database } from "@/server/db/client";
import { translationCache } from "@/server/db/schema";
import type { TranslationCache } from "@/server/services/translation-cache";
import { isCacheableText } from "./policy";

export function createTranslationCache(
  getDatabase: () => Database,
): TranslationCache {
  return {
    async get(hash) {
      // Una sola sentencia evita perder incrementos cuando hay peticiones simultáneas.
      const [row] = await getDatabase()
        .update(translationCache)
        .set({
          hits: sql`${translationCache.hits} + 1`,
          lastUsedAt: sql`now()`,
        })
        .where(eq(translationCache.hash, hash))
        .returning({
          hash: translationCache.hash,
          sourceText: translationCache.sourceText,
          source: translationCache.sourceLang,
          target: translationCache.targetLang,
          translation: translationCache.translatedText,
          detectedSource: translationCache.detectedSource,
          provider: translationCache.provider,
        });

      if (!row) return null;
      // Una fila dañada no debe producir una respuesta pública inválida.
      const request = translateRequestSchema.parse({
        text: row.sourceText,
        source: row.source ?? undefined,
        target: row.target,
      });
      const result = translateResponseSchema.parse({
        translation: row.translation,
        detectedSource: row.detectedSource,
        cached: true,
      });
      if (!isCacheableText(request.text)) return null;
      return {
        hash: row.hash,
        sourceText: request.text,
        source: request.source,
        target: request.target,
        translation: result.translation,
        detectedSource: result.detectedSource,
        provider: row.provider,
      };
    },
    async set(entry) {
      if (!isCacheableText(entry.sourceText)) return;
      await getDatabase()
        .insert(translationCache)
        .values({
          hash: entry.hash,
          sourceLang: entry.source ?? null,
          targetLang: entry.target,
          detectedSource: entry.detectedSource,
          sourceText: entry.sourceText,
          translatedText: entry.translation,
          provider: entry.provider,
        })
        .onConflictDoNothing({ target: translationCache.hash });
    },
  };
}
