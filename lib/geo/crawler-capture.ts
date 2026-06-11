/**
 * Server-side capture of AI crawler / AI referrer traffic (GEO measurement).
 *
 * The client-side `ai_referral` PostHog event only sees visitors who run JS
 * and pass consent. AI vendor bots (GPTBot, ClaudeBot, PerplexityBot, …)
 * fetch pages server-side with no JS at all, so they were invisible. This
 * module classifies a request with the existing `lib/geo/ai-referrer`
 * rules and records a sample into `analytics_events` via a fire-and-forget
 * Supabase REST insert.
 *
 * Designed to be called from `proxy.ts` (Edge middleware), so the hard
 * requirements are:
 *
 *  - **Edge-safe**: imports only the pure classifier; no Node built-ins,
 *    no Supabase SDK, no logger.
 *  - **Zero added latency**: classification is a handful of regex tests;
 *    the insert is handed to `NextFetchEvent.waitUntil` (or detached when
 *    no event is available) and never awaited on the request path.
 *  - **Fail-open**: every error path — missing env, fetch throw, rejected
 *    insert — is swallowed. A capture failure must never affect the
 *    response.
 *  - **No PII**: stored fields are UA string, path, classifier labels and
 *    the row timestamp. No IP, no session, no cookies, no full referrer
 *    URL (only the matched source label).
 *
 * Sampling is deliberately 100%: AI-crawler hits are rare (the path filter
 * and the placeholder-env short-circuit bound the volume), and
 * `analytics_events` already has a 90-day retention sweep. The
 * `GEO_SERVER_CAPTURE_DISABLED=1` env var is an emergency off switch.
 *
 * RLS note: `analytics_events` has an anon INSERT policy (event_type
 * non-empty), so the insert uses the *anon* key — no service-role secret
 * ever enters the middleware.
 */

import { classifyAiCrawler, classifyAiReferrer } from "@/lib/geo/ai-referrer";

/** A vendor bot fetched the page directly (detected from User-Agent). */
export const AI_CRAWLER_EVENT_TYPE = "ai_crawler_fetch";
/**
 * A visitor arrived from an AI assistant/answer engine (detected from the
 * Referer header). Named distinctly from the client-side PostHog
 * `ai_referral` event so the two capture paths never get conflated.
 */
export const AI_REFERRER_EVENT_TYPE = "ai_referral_server";

export interface AiTrafficSample {
  event_type: string;
  event_data: Record<string, string>;
  page: string;
  user_agent: string | null;
}

export interface AiTrafficInput {
  method: string;
  pathname: string;
  userAgent: string | null;
  referrer: string | null;
}

/**
 * Only page-like GET requests are worth a classification pass. API routes,
 * admin/portal chrome, Next internals and extension-suffixed assets
 * (robots.txt, sitemap.xml, images) are skipped so normal traffic pays as
 * close to zero as possible and the sample stream stays page-focused.
 */
export function shouldInspectRequest(method: string, pathname: string): boolean {
  if (method !== "GET") return false;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next")
  ) {
    return false;
  }
  // Anything with a file extension (".txt", ".xml", ".png", …) is an asset
  // fetch, not a page render.
  if (/\.[a-zA-Z0-9]{1,8}$/.test(pathname)) return false;
  return true;
}

/**
 * Pure classification step — returns the row to insert, or null when the
 * request is ordinary traffic. Crawler UA wins over referrer when both
 * somehow match (a bot UA is the stronger signal).
 */
export function buildAiTrafficSample(input: AiTrafficInput): AiTrafficSample | null {
  if (!shouldInspectRequest(input.method, input.pathname)) return null;

  const page = input.pathname.slice(0, 500);
  const userAgent = input.userAgent ? input.userAgent.slice(0, 500) : null;

  const crawler = classifyAiCrawler(input.userAgent);
  if (crawler) {
    return {
      event_type: AI_CRAWLER_EVENT_TYPE,
      event_data: {
        bot: crawler.bot,
        vendor: crawler.vendor,
        purpose: crawler.purpose,
        capture: "server",
      },
      page,
      user_agent: userAgent,
    };
  }

  const referrer = classifyAiReferrer(input.referrer);
  if (referrer) {
    return {
      event_type: AI_REFERRER_EVENT_TYPE,
      event_data: {
        source: referrer.source,
        vendor: referrer.vendor,
        kind: referrer.kind,
        capture: "server",
      },
      page,
      user_agent: userAgent,
    };
  }

  return null;
}

/**
 * Classify the request and, on a hit, queue a fire-and-forget insert.
 * Never throws, never blocks: the returned-promise-shaped work is handed
 * to `waitUntil` when provided (Edge middleware) or detached otherwise.
 */
export function captureAiTraffic(
  input: AiTrafficInput,
  waitUntil?: (promise: Promise<unknown>) => void,
): void {
  try {
    if (process.env.GEO_SERVER_CAPTURE_DISABLED === "1") return;

    const sample = buildAiTrafficSample(input);
    if (!sample) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // CI/preview builds run with placeholder Supabase creds (see
    // lib/feature-flags.ts) — never emit junk rows from those environments.
    if (!supabaseUrl || !anonKey || supabaseUrl.includes("placeholder")) return;

    const insert = fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify(sample),
      // A hung insert must not pin the function alive — bound it.
      signal: AbortSignal.timeout(5_000),
    }).then(
      () => undefined,
      () => undefined, // swallow — capture is strictly best-effort
    );

    if (waitUntil) waitUntil(insert);
    else void insert;
  } catch {
    // Fail-open by contract: a capture failure must never affect the response.
  }
}
