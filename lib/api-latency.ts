// eslint-disable-next-line no-restricted-imports -- api_latency_samples is service-role-only; samples are written from any route handler so the admin client is the documented exception.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api-latency");

// Per-route latency sampling — append-only writes to api_latency_samples.
// Routes wrap their handler with `withLatencySample(routePath, handler)`
// to record a percentage of requests. Defaults to 1% sampling — keeps
// the table small + lets the daily slo-monitor compute a meaningful
// p95 without inflating DB write load.
//
// Why sample instead of recording everything: at ~50 req/s the
// every-request path would write ~4.3M rows/day. 1% sampling gives
// ~43k/day, which p95 estimates accurately + the retention cron prunes
// without blowing the IO budget.

const DEFAULT_SAMPLE_RATE = 0.01;

export interface WithLatencyOptions {
  /** Sampling rate 0–1 (default 0.01 = 1%). */
  rate?: number;
}

export function withLatencySample<Args extends unknown[], T>(
  routePath: string,
  handler: (...args: Args) => Promise<Response | T>,
  options: WithLatencyOptions = {},
): (...args: Args) => Promise<Response | T> {
  const rate = options.rate ?? DEFAULT_SAMPLE_RATE;

  return async (...args: Args): Promise<Response | T> => {
    const shouldSample = Math.random() < rate;
    const start = shouldSample ? performance.now() : 0;

    const result = await handler(...args);

    if (!shouldSample) return result;

    const duration = Math.round(performance.now() - start);
    let status = 200;
    if (result instanceof Response) status = result.status;

    // Fire-and-forget; never block the response on the sample insert.
    void recordSample(routePath, duration, status);

    return result;
  };
}

async function recordSample(routePath: string, durationMs: number, status: number): Promise<void> {
  if (durationMs < 0 || durationMs > 600_000) return;
  try {
    const supabase = createAdminClient();
    await supabase.from("api_latency_samples").insert({
      route_path: routePath,
      duration_ms: durationMs,
      status,
    });
  } catch (err) {
    log.warn("latency sample insert failed", {
      route: routePath,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Direct sample-record helper for routes that don't wrap their handler
 * (e.g. cron routes that want to track their own duration even though
 * the route is invoked by Vercel, not user traffic).
 */
export async function recordLatencySample(
  routePath: string,
  durationMs: number,
  status: number,
): Promise<void> {
  await recordSample(routePath, durationMs, status);
}
