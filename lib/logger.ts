import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Second-arg type for logger calls. Accepts `unknown` so call sites
 * can pass raw Error objects, Supabase PostgrestError / StorageError,
 * strings, or free-form metadata records without casting. Internally
 * we normalise to a Record<string, unknown> before emitting.
 */
export type LogMeta = Record<string, unknown> | Error | string | unknown;

export interface Logger {
  debug(msg: string, meta?: LogMeta): void;
  info(msg: string, meta?: LogMeta): void;
  warn(msg: string, meta?: LogMeta): void;
  error(msg: string, meta?: LogMeta): void;
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

/**
 * Normalise the free-form second arg into a Record we can JSON.stringify.
 * - Error → { name, message, stack }
 * - string → { detail: string }
 * - record → passed through unchanged
 * - anything else → { value: <inspected> }
 */
function normaliseMeta(meta: LogMeta): Record<string, unknown> | undefined {
  if (meta === undefined || meta === null) return undefined;
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    };
  }
  if (typeof meta === "string") {
    return { detail: meta };
  }
  if (typeof meta === "object") {
    return meta as Record<string, unknown>;
  }
  return { value: String(meta) };
}

function emit(
  level: LogLevel,
  ctx: string,
  msg: string,
  rawMeta?: LogMeta,
) {
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;
  const meta = normaliseMeta(rawMeta);

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

  // Sentry integration.
  //
  // - For errors: prefer captureException with the actual Error object
  //   (preserves stack trace + frame source mapping). Fall back to
  //   captureMessage if the meta only contains a string error.
  // - For warns and infos: leave a breadcrumb so they show up as
  //   context on the next captured exception.
  // - Always tag with the logger context so issues can be grouped by
  //   the route / module that produced them.
  try {
    if (level === "error") {
      const errMeta = meta?.error;
      const errObj = meta?.err;
      const candidate =
        errObj instanceof Error
          ? errObj
          : errMeta instanceof Error
            ? errMeta
            : null;

      if (candidate) {
        Sentry.captureException(candidate, {
          tags: { ctx },
          extra: { msg, ...meta },
        });
      } else {
        Sentry.captureMessage(`[${ctx}] ${msg}`, {
          level: "error",
          tags: { ctx },
          extra: meta,
        });
      }
    } else if (level === "warn") {
      Sentry.captureMessage(`[${ctx}] ${msg}`, {
        level: "warning",
        tags: { ctx },
        extra: meta,
      });
    } else {
      // info / debug → breadcrumb only, attached to the next event
      Sentry.addBreadcrumb({
        category: ctx,
        level: level === "info" ? "info" : "debug",
        message: msg,
        data: meta,
      });
    }
  } catch {
    // Sentry not initialized or unavailable — silently ignore
  }
}

export function logger(context: string): Logger {
  return {
    debug: (msg: string, meta?: LogMeta) => emit("debug", context, msg, meta),
    info:  (msg: string, meta?: LogMeta) => emit("info", context, msg, meta),
    warn:  (msg: string, meta?: LogMeta) => emit("warn", context, msg, meta),
    error: (msg: string, meta?: LogMeta) => emit("error", context, msg, meta),
  };
}
