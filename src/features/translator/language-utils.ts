import {
  sourceLanguages,
  targetLanguages,
  type SourceLanguageCode,
  type TargetLanguageCode,
} from "@/lib/languages";

export function toSourceLanguage(code: string): SourceLanguageCode | undefined {
  const normalized = code.toUpperCase().split("-")[0];
  return sourceLanguages.find((language) => language.code === normalized)?.code;
}

export function toTargetLanguage(
  code: SourceLanguageCode,
): TargetLanguageCode | undefined {
  const target = code === "EN" ? "EN-US" : code === "PT" ? "PT-BR" : code;
  return targetLanguages.find((language) => language.code === target)?.code;
}

export function sourceLanguageName(code: string): string {
  return (
    sourceLanguages.find((language) => language.code === toSourceLanguage(code))
      ?.name ?? code
  );
}
