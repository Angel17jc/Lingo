export const languages = [
  { code: "ES", name: "Español", source: true, target: true },
  { code: "EN", name: "Inglés", source: true, target: false },
  {
    code: "EN-US",
    name: "Inglés (Estados Unidos)",
    source: false,
    target: true,
  },
  { code: "EN-GB", name: "Inglés (Reino Unido)", source: false, target: true },
  { code: "FR", name: "Francés", source: true, target: true },
  { code: "DE", name: "Alemán", source: true, target: true },
  { code: "IT", name: "Italiano", source: true, target: true },
  { code: "PT", name: "Portugués", source: true, target: false },
  { code: "PT-BR", name: "Portugués (Brasil)", source: false, target: true },
  { code: "PT-PT", name: "Portugués (Portugal)", source: false, target: true },
] as const;

export type Language = (typeof languages)[number];
export type LanguageCode = Language["code"];
export type SourceLanguageCode = Extract<Language, { source: true }>["code"];
export type TargetLanguageCode = Extract<Language, { target: true }>["code"];

export const sourceLanguages = languages.filter((language) => language.source);
export const targetLanguages = languages.filter((language) => language.target);
