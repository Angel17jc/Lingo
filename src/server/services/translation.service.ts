import "server-only";
import type {
  TranslateRequest,
  TranslateResponse,
} from "@/features/translator/schemas";
import type { TranslationProvider } from "@/server/providers/translation-provider";
import type { TranslationCache } from "./translation-cache";

export interface TranslationService {
  translate(input: TranslateRequest): Promise<TranslateResponse>;
}

export type TranslationServiceDependencies = {
  provider: TranslationProvider;
  // Se acepta el puerto, pero no se consulta ni escribe hasta la fase 4.
  cache?: TranslationCache;
};

export function createTranslationService({
  provider,
}: TranslationServiceDependencies): TranslationService {
  return {
    async translate(input) {
      const result = await provider.translate(input);
      return {
        translation: result.text,
        detectedSource: result.detectedSource,
        cached: false,
      };
    },
  };
}
