import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  environment: process.env.NODE_ENV,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  /**
   * beforeSend — enrich every event with the request id that the
   * proxy.ts middleware stamped on the incoming request. This
   * lets on-call correlate a Sentry error with a Vercel log line
   * in one click.
   *
   * Also scrubs common sensitive fields from error context so a
   * stack frame containing a form submit doesn't accidentally
   * leak a password or API key to Sentry.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeSend(event: any) {
    try {
      // Pull request id from the request headers if we have them
      const headers = event.request?.headers as
        | Record<string, string>
        | undefined;
      const requestId =
        headers?.["x-request-id"] ||
        headers?.["X-Request-Id"] ||
        headers?.["x-vercel-id"] ||
        null;
      if (requestId) {
        event.tags = { ...(event.tags || {}), request_id: requestId };
      }

      // Scrub obviously sensitive body keys
      if (event.request?.data && typeof event.request.data === "object") {
        const data = event.request.data as Record<string, unknown>;
        for (const key of Object.keys(data)) {
          if (/password|token|secret|api_key|card|cvv|tfn/i.test(key)) {
            data[key] = "[scrubbed]";
          }
        }
      }

      // Tag the user's vertical if we know it from the URL
      const url = event.request?.url;
      if (typeof url === "string") {
        const m = url.match(/\/(compare|find-advisor|quiz|property|super|broker|crypto|etfs)(\/|$|\?)/);
        if (m) {
          event.tags = { ...(event.tags || {}), vertical: m[1] };
        }
      }
    } catch {
      // Never let our own enrichment throw — fall through with
      // whatever we managed to attach
    }
    return event;
  },

  /**
   * Ignore known-benign exceptions that clutter the dashboard:
   *   - Next.js AbortError from cancelled fetches
   *   - Supabase auth session missing (user signed out mid-request)
   */
  ignoreErrors: [
    /AbortError/,
    /Auth session missing/i,
    /NEXT_NOT_FOUND/,
  ],
});
