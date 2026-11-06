export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  readonly httpStatus = 400;

  constructor() {
    super("Los datos de traducción no son válidos.");
  }
}

export class RateLimitError extends DomainError {
  readonly code = "RATE_LIMIT_EXCEEDED";
  readonly httpStatus = 429;
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Has realizado demasiadas solicitudes. Inténtalo más tarde.");
    if (!Number.isSafeInteger(retryAfterSeconds) || retryAfterSeconds < 1) {
      throw new RangeError(
        "retryAfterSeconds debe ser un entero positivo seguro.",
      );
    }
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ProviderError extends DomainError {
  readonly code = "PROVIDER_ERROR";
  readonly httpStatus = 502;

  constructor() {
    super("No se pudo completar la traducción. Inténtalo más tarde.");
  }
}

export class QuotaExceededError extends DomainError {
  readonly code = "QUOTA_EXCEEDED";
  readonly httpStatus = 503;

  constructor() {
    super("La cuota de traducción está agotada. Inténtalo más tarde.");
  }
}
