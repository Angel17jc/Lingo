import { z } from "zod";
import { sourceLanguages, targetLanguages } from "@/lib/languages";

export const MAX_TRANSLATION_CHARACTERS = 3000;

const sourceLanguageSchema = z.enum(
  sourceLanguages.map((language) => language.code),
);
const targetLanguageSchema = z.enum(
  targetLanguages.map((language) => language.code),
);

export const translateRequestSchema = z.strictObject({
  text: z.string().trim().min(1).max(MAX_TRANSLATION_CHARACTERS),
  source: sourceLanguageSchema.optional(),
  target: targetLanguageSchema,
});

export const translateResponseSchema = z.strictObject({
  // El resultado puede superar la longitud de la entrada y conserva sus espacios.
  translation: z.string().min(1),
  // La autodetección puede reconocer idiomas fuera del catálogo de selectores.
  detectedSource: z.string().trim().min(1),
  cached: z.boolean(),
});

export type TranslateRequest = z.infer<typeof translateRequestSchema>;
export type TranslateResponse = z.infer<typeof translateResponseSchema>;
