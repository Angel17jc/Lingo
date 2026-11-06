import type { SourceLanguageCode, TargetLanguageCode } from "@/lib/languages";

export type TranslationCacheEntry = {
  hash: string;
  sourceText: string;
  source?: SourceLanguageCode;
  target: TargetLanguageCode;
  translation: string;
  detectedSource: string;
  provider: string;
};

// Puerto reservado para la integración de caché en la fase 4.
export interface TranslationCache {
  get(hash: string): Promise<TranslationCacheEntry | null>;
  set(entry: TranslationCacheEntry): Promise<void>;
}
