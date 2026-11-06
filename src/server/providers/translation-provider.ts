import type { SourceLanguageCode, TargetLanguageCode } from "@/lib/languages";

export type TranslationInput = {
  text: string;
  source?: SourceLanguageCode;
  target: TargetLanguageCode;
};

export type TranslationResult = {
  text: string;
  detectedSource: string;
};

export interface TranslationProvider {
  readonly name: string;
  translate(input: TranslationInput): Promise<TranslationResult>;
}
