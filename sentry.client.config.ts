import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — kept always-on (browser-tracing is small)
  // but sample rate halved from 0.1 → 0.05. Tracing data is long-tail
  // useful and the bundle / runtime cost was disproportionate at 10%.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  // Replay for debugging errors — 1% of sessions, 100% of error sessions.
  // The replay SDK itself is ~70 kB gz; `lazyLoadIntegration` defers
  // download/parse to on-demand instead of shipping to 100% of visitors
  // for a 1% sample.
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.lazyLoadIntegration("replayIntegration"),
    Sentry.browserTracingIntegration(),
  ],

  // Filter noisy errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /Loading chunk \d+ failed/,
    /Load failed/,
    /ChunkLoadError/,
  ],

  environment: process.env.NODE_ENV,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
