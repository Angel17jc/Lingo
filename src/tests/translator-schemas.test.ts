import { describe, expect, expectTypeOf, it } from "vitest";
import {
  translateRequestSchema,
  translateResponseSchema,
  type TranslateRequest,
  type TranslateResponse,
} from "@/features/translator/schemas";
import {
  sourceLanguages,
  targetLanguages,
  type SourceLanguageCode,
  type TargetLanguageCode,
} from "@/lib/languages";

describe("contrato de solicitud de traducción", () => {
  it("omite el origen para autodetección y recorta solo los extremos", () => {
    expect(
      translateRequestSchema.parse({
        text: "  Hola  mundo\nsegunda línea  ",
        target: "EN-US",
      }),
    ).toEqual({ text: "Hola  mundo\nsegunda línea", target: "EN-US" });
  });

  it.each(sourceLanguages)("acepta $code como origen", ({ code }) => {
    expect(
      translateRequestSchema.safeParse({
        text: "Hola",
        source: code,
        target: "EN-US",
      }).success,
    ).toBe(true);
  });

  it.each(targetLanguages)("acepta $code como destino", ({ code }) => {
    expect(
      translateRequestSchema.safeParse({ text: "Hola", target: code }).success,
    ).toBe(true);
  });

  it.each([1, 3000])("acepta el límite de %i caracteres", (length) => {
    expect(
      translateRequestSchema.safeParse({
        text: "a".repeat(length),
        target: "FR",
      }).success,
    ).toBe(true);
  });

  it("comprueba la longitud después de recortar", () => {
    expect(
      translateRequestSchema.parse({
        text: `  ${"a".repeat(3000)}  `,
        target: "FR",
      }).text,
    ).toHaveLength(3000);
  });

  it.each([
    ["vacío", { text: "", target: "FR" }],
    ["solo espacios", { text: " \n\t ", target: "FR" }],
    ["demasiado largo", { text: "a".repeat(3001), target: "FR" }],
    ["texto ausente", { target: "FR" }],
    ["texto numérico", { text: 123, target: "FR" }],
    ["destino ausente", { text: "Hola" }],
    ["destino desconocido", { text: "Hola", target: "XX" }],
    ["destino en minúsculas", { text: "Hola", target: "fr" }],
    ["destino nulo", { text: "Hola", target: null }],
    ["origen nulo", { text: "Hola", source: null, target: "FR" }],
    ["origen desconocido", { text: "Hola", source: "XX", target: "FR" }],
    [
      "autodetección como cadena",
      { text: "Hola", source: "auto", target: "FR" },
    ],
    [
      "campo ajeno al contrato",
      { text: "Hola", target: "FR", provider: "azure" },
    ],
    ["cuerpo nulo", null],
    ["cuerpo como lista", []],
  ])("rechaza %s", (_description, request) => {
    expect(translateRequestSchema.safeParse(request).success).toBe(false);
  });

  it.each(["EN-US", "EN-GB", "PT-BR", "PT-PT"])(
    "rechaza la variante %s como origen",
    (source) => {
      expect(
        translateRequestSchema.safeParse({ text: "Hola", source, target: "FR" })
          .success,
      ).toBe(false);
    },
  );

  it.each(["EN", "PT"])("rechaza %s como destino sin variante", (target) => {
    expect(
      translateRequestSchema.safeParse({ text: "Hola", target }).success,
    ).toBe(false);
  });

  it("deriva los tipos de origen y destino desde el catálogo", () => {
    expectTypeOf<TranslateRequest["source"]>().toEqualTypeOf<
      SourceLanguageCode | undefined
    >();
    expectTypeOf<
      TranslateRequest["target"]
    >().toEqualTypeOf<TargetLanguageCode>();
  });
});

describe("contrato de respuesta de traducción", () => {
  it.each([true, false])("acepta cached=%s y conserva el texto", (cached) => {
    const response: TranslateResponse = {
      translation: "  Hello\nworld  ",
      detectedSource: "ES",
      cached,
    };
    expect(translateResponseSchema.parse(response)).toEqual(response);
  });

  it("acepta una traducción más larga que el límite de entrada", () => {
    expect(
      translateResponseSchema.safeParse({
        translation: "a".repeat(4000),
        detectedSource: "ES",
        cached: false,
      }).success,
    ).toBe(true);
  });

  it("acepta un idioma autodetectado fuera de los selectores", () => {
    expect(
      translateResponseSchema.safeParse({
        translation: "Hola",
        detectedSource: "JA",
        cached: false,
      }).success,
    ).toBe(true);
  });

  it.each([
    [
      "traducción vacía",
      { translation: "", detectedSource: "ES", cached: false },
    ],
    ["traducción ausente", { detectedSource: "ES", cached: false }],
    [
      "origen vacío",
      { translation: "Hello", detectedSource: " ", cached: false },
    ],
    ["origen ausente", { translation: "Hello", cached: false }],
    ["cached ausente", { translation: "Hello", detectedSource: "ES" }],
    [
      "cached incorrecto",
      { translation: "Hello", detectedSource: "ES", cached: "false" },
    ],
    [
      "campo interno",
      {
        translation: "Hello",
        detectedSource: "ES",
        cached: false,
        apiKey: "test",
      },
    ],
    ["cuerpo nulo", null],
  ])("rechaza %s", (_description, response) => {
    expect(translateResponseSchema.safeParse(response).success).toBe(false);
  });
});
