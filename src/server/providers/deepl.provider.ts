import "server-only";
import { z } from "zod";
import { ProviderError, QuotaExceededError } from "@/server/errors";
import type {
  TranslationInput,
  TranslationProvider,
  TranslationResult,
} from "./translation-provider";

const ENDPOINT = "https://api-free.deepl.com/v2/translate";
const TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 300;
const MAX_ATTEMPTS = 2;

const responseSchema = z.object({
  translations: z.tuple([
    z.object({
      text: z.string().min(1),
      detected_source_language: z.string().trim().min(1),
    }),
  ]),
});

class RetryableProviderError extends Error {}

export class DeepLProvider implements TranslationProvider {
  readonly name = "deepl";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!apiKey.trim()) throw new ProviderError();
  }

  async translate(input: TranslationInput): Promise<TranslationResult> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        return await this.request(input, controller.signal);
      } catch (error) {
        if (
          error instanceof QuotaExceededError ||
          error instanceof ProviderError
        ) {
          throw error;
        }
        if (
          !(error instanceof RetryableProviderError) ||
          attempt === MAX_ATTEMPTS - 1
        ) {
          throw new ProviderError();
        }
      } finally {
        clearTimeout(timeout);
        // Libera también respuestas de error cuyo cuerpo no se consume.
        controller.abort();
      }

      await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }

    throw new ProviderError();
  }

  private async request(
    input: TranslationInput,
    signal: AbortSignal,
  ): Promise<TranslationResult> {
    let response: Response;
    try {
      response = await this.fetcher(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: [input.text],
          target_lang: input.target,
          ...(input.source ? { source_lang: input.source } : {}),
        }),
        signal,
        cache: "no-store",
        redirect: "error",
      });
    } catch {
      throw new RetryableProviderError();
    }

    // Compatibilidad con la guía: 429 y 456 representan indisponibilidad por cuota.
    if (response.status === 429 || response.status === 456) {
      throw new QuotaExceededError();
    }
    if (response.status >= 500 && response.status <= 599) {
      throw new RetryableProviderError();
    }
    if (!response.ok) throw new ProviderError();

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) throw new ProviderError();
      throw new RetryableProviderError();
    }

    const result = responseSchema.safeParse(body);
    if (!result.success) throw new ProviderError();

    const [translation] = result.data.translations;
    return {
      text: translation.text,
      detectedSource: translation.detected_source_language,
    };
  }
}
