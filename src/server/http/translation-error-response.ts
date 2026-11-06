import "server-only";
import { logger } from "@/lib/logger";
import { DomainError, RateLimitError } from "@/server/errors";

export function translationErrorResponse(error: unknown): Response {
  const domainError = error instanceof DomainError ? error : undefined;
  const status = domainError?.httpStatus ?? 500;
  const headers = new Headers({ "Cache-Control": "no-store" });
  const retryAfterSeconds =
    error instanceof RateLimitError ? error.retryAfterSeconds : undefined;

  if (retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(retryAfterSeconds));
  }
  if (status >= 500) {
    logger.error("translation.failed", { status });
  }

  return Response.json(
    {
      error: {
        code: domainError?.code ?? "INTERNAL_ERROR",
        message:
          domainError?.message ??
          "No se pudo procesar la solicitud. Inténtalo más tarde.",
        ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
      },
    },
    { status, headers },
  );
}
