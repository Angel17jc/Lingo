import { z } from "zod";
import { messages } from "@/lib/messages";

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    retryAfterSeconds: z.number().int().positive().optional(),
  }),
});

export type TranslationClientError = {
  kind:
    | "validation"
    | "network"
    | "provider"
    | "quota"
    | "rate-limit"
    | "unexpected";
  message: string;
  retryAfterSeconds?: number;
};

export function readTranslationError(
  status: number,
  body: unknown,
  retryAfter: string | null,
  now = Date.now(),
): TranslationClientError {
  const parsed = errorSchema.safeParse(body);
  const code = parsed.success ? parsed.data.error.code : undefined;
  if (status === 429 || code === "RATE_LIMIT_EXCEEDED") {
    const numeric =
      retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : undefined;
    const date =
      retryAfter && numeric === undefined ? Date.parse(retryAfter) : Number.NaN;
    const seconds =
      numeric ??
      (Number.isFinite(date) ? Math.ceil((date - now) / 1000) : undefined) ??
      (parsed.success ? parsed.data.error.retryAfterSeconds : undefined) ??
      30;
    return {
      kind: "rate-limit",
      message: messages.errors.rateLimit,
      retryAfterSeconds: Math.min(
        86400,
        Math.max(1, Number.isFinite(seconds) ? Math.ceil(seconds) : 30),
      ),
    };
  }
  if (code === "QUOTA_EXCEEDED" || status === 503)
    return { kind: "quota", message: messages.errors.quota };
  if (status === 400)
    return { kind: "validation", message: messages.errors.invalid };
  if (status === 502)
    return { kind: "provider", message: messages.errors.provider };
  return { kind: "unexpected", message: messages.errors.unexpected };
}
