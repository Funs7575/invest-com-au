import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const IS_PROD = process.env.NODE_ENV === "production";

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? (IS_PROD ? "warn" : "debug");

// Dev-mode prefixes per level
const DEV_ICONS: Record<LogLevel, string> = {
  debug: "\x1b[90m[DBG]\x1b[0m",   // gray
  info:  "\x1b[36m[INF]\x1b[0m",    // cyan
  warn:  "\x1b[33m[WRN]\x1b[0m",    // yellow
  error: "\x1b[31m[ERR]\x1b[0m",    // red
};

function emit(
  level: LogLevel,
  ctx: string,
  msg: string,
  meta?: Record<string, unknown>,
) {
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;

  // Pick console method so Vercel runtime log filtering works
  const fn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;

  if (IS_PROD) {
    // Structured single-line JSON for log aggregation
    fn(
      JSON.stringify({
        level,
        ctx,
        msg,
        ...meta,
        ts: new Date().toISOString(),
      }),
    );
  } else {
    // Human-readable colored output
    const prefix = `${DEV_ICONS[level]} \x1b[1m[${ctx}]\x1b[0m`;
    if (meta && Object.keys(meta).length > 0) {
      fn(prefix, msg, meta);
    } else {
      fn(prefix, msg);
    }
  }

  // Sentry integration for errors
  if (level === "error") {
    try {
      Sentry.captureMessage(`[${ctx}] ${msg}`, {
        level: "error",
        extra: meta,
      });
    } catch {
      // Sentry not initialized or unavailable — silently ignore
    }
  }
}

export function logger(context: string): Logger {
  return {
    debug: (msg, meta?) => emit("debug", context, msg, meta),
    info:  (msg, meta?) => emit("info", context, msg, meta),
    warn:  (msg, meta?) => emit("warn", context, msg, meta),
    error: (msg, meta?) => emit("error", context, msg, meta),
  };
}
