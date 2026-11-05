import "server-only";

type LogEvent =
  | "app.started"
  | "translation.failed"
  | "cache.unavailable"
  | "ratelimit.unavailable"
  | "quota.warning";
type LogContext = {
  provider?: "deepl" | "azure";
  status?: number;
  durationMs?: number;
};

// Lista cerrada de eventos y campos: nunca acepta texto libre ni objetos de error.
function log(
  level: "info" | "warn" | "error",
  event: LogEvent,
  context: LogContext = {},
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    provider:
      context.provider === "deepl" || context.provider === "azure"
        ? context.provider
        : undefined,
    status:
      typeof context.status === "number" && Number.isFinite(context.status)
        ? context.status
        : undefined,
    durationMs:
      typeof context.durationMs === "number" &&
      Number.isFinite(context.durationMs)
        ? context.durationMs
        : undefined,
  };
  console[level](JSON.stringify(entry));
}

export const logger = {
  info: (event: LogEvent, context?: LogContext) => log("info", event, context),
  warn: (event: LogEvent, context?: LogContext) => log("warn", event, context),
  error: (event: LogEvent, context?: LogContext) =>
    log("error", event, context),
};
