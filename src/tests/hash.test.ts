import { describe, expect, it, vi } from "vitest";
import { createTranslationHash } from "@/lib/hash";

vi.mock("server-only", () => ({}));

const input = { text: "Hola mundo", source: "ES", target: "EN-US" } as const;

describe("hash de traducción", () => {
  it("produce una clave SHA-256 hexadecimal estable", () => {
    const hash = createTranslationHash(input);
    expect(hash).toBe(
      "6b6574e64fd72046cf3aa271c1d9cfcc5198138860c0b198ea8330832cb133bf",
    );
    expect(createTranslationHash({ ...input })).toBe(hash);
  });

  it.each([
    "  Hola mundo  ",
    "Hola   mundo",
    "\tHola\tmundo\r\n",
    "Hola\n\n mundo",
    "\u00a0Hola\u00a0mundo\u00a0",
  ])("normaliza espacios equivalentes: %j", (text) => {
    expect(createTranslationHash({ ...input, text })).toBe(
      createTranslationHash(input),
    );
  });

  it.each(["hola mundo", "Hola mundo!", "Hola, mundo", "Hola múndo"])(
    "conserva diferencias relevantes: %j",
    (text) => {
      expect(createTranslationHash({ ...input, text })).not.toBe(
        createTranslationHash(input),
      );
    },
  );

  it("distingue el origen explícito de la autodetección", () => {
    expect(
      createTranslationHash({ text: input.text, target: input.target }),
    ).not.toBe(createTranslationHash(input));
  });

  it("trata igual origen omitido y undefined", () => {
    expect(
      createTranslationHash({ text: input.text, target: input.target }),
    ).toBe(createTranslationHash({ ...input, source: undefined }));
  });

  it("distingue los idiomas de origen", () => {
    expect(createTranslationHash({ ...input, source: "PT" })).not.toBe(
      createTranslationHash(input),
    );
  });

  it("distingue las variantes regionales de destino", () => {
    expect(createTranslationHash({ ...input, target: "EN-GB" })).not.toBe(
      createTranslationHash(input),
    );
  });

  it("separa proveedores y conserva la clave v1 sin proveedor", () => {
    expect(createTranslationHash(input, "deepl")).not.toBe(
      createTranslationHash(input, "azure"),
    );
    expect(createTranslationHash(input, "deepl")).not.toBe(
      createTranslationHash(input),
    );
    expect(createTranslationHash(input, "deepl")).toBe(
      createTranslationHash({ ...input, text: " Hola   mundo " }, "deepl"),
    );
  });

  it("acepta Unicode y campos con delimitadores sin alterar la entrada", () => {
    const unicodeInput = {
      text: 'こんにちは 🌎 | ES | EN-US ["v1", null]',
      target: "ES",
    } as const;
    const originalText = unicodeInput.text;
    const hash = createTranslationHash(unicodeInput);
    expect(hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(hash).not.toBe(
      createTranslationHash({ ...unicodeInput, text: `${originalText}!` }),
    );
    expect(unicodeInput.text).toBe(originalText);
  });
});
