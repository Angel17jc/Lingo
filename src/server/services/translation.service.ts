import "server-only";
import type {
  TranslateRequest,
  TranslateResponse,
} from "@/features/translator/schemas";
import type { TranslationProvider } from "@/server/providers/translation-provider";
import { createTranslationHash } from "@/lib/hash";
import { logger } from "@/lib/logger";
import { isCacheableText } from "@/server/cache/policy";
import type { TranslationCache } from "./translation-cache";

export interface TranslationService {
  translate(input: TranslateRequest): Promise<TranslateResponse>;
}

export type TranslationServiceDependencies = {
  provider: TranslationProvider;
  cache?: TranslationCache;
};

export function createTranslationService({
  provider,
  cache,
}: TranslationServiceDependencies): TranslationService {
  return {
    async translate(input) {
      const hash =
        cache && isCacheableText(input.text)
          ? createTranslationHash(input, provider.name)
          : undefined;
      let cacheAvailable = true;
      if (cache && hash) {
        try {
          const cached = await cache.get(hash);
          if (cached && cached.provider === provider.name) {
            return {
              translation: cached.translation,
              detectedSource: cached.detectedSource,
              cached: true,
            };
          }
        } catch {
          cacheAvailable = false;
          logger.warn("cache.unavailable");
        }
      }

      const result = await provider.translate(input);
      if (cache && hash && cacheAvailable) {
        try {
          await cache.set({
            hash,
            sourceText: input.text,
            source: input.source,
            target: input.target,
            translation: result.text,
            detectedSource: result.detectedSource,
            provider: provider.name,
          });
        } catch {
          logger.warn("cache.unavailable");
        }
      }
      return {
        translation: result.text,
        detectedSource: result.detectedSource,
        cached: false,
      };
    },
  };
}
