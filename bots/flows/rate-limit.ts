/**
 * Rate-limit probe flow.
 *
 * `lib/rate-limit.ts` guards the app's endpoints, but nothing ever verified the
 * limiter actually *engages* under a burst, or that it degrades cleanly (429,
 * not 500). This flow bursts a deliberately-chosen endpoint and asserts:
 *
 *   1. A 429 appears once the cap is exceeded — the limiter is wired and firing.
 *   2. No request 5xx's — being rate-limited must be a clean rejection, never a
 *      server crash.
 *   3. (low) A 429 ideally carries a Retry-After header so clients can back off.
 *
 * SAFETY: the default target is `GET /api/pros/availability`, chosen precisely
 * because it is **read-only with no side effects** — the rate-limit check runs
 * *before* the advisor-session gate, so an anonymous burst gets 401s up to the
 * cap and 429s past it, writing nothing. We use `page.request` (which bypasses
 * the page route firewall) deliberately, because hitting the *real* limiter is
 * the whole point; restricting to a side-effect-free GET keeps that safe on any
 * target. Configure via `BOTS_RATELIMIT_PATH` (GET-only) / `BOTS_RATELIMIT_BURST`.
 */

import type { Flow } from "./types";

const DEFAULT_PATH = "/api/pros/availability";

function probeConfig() {
  const path = process.env.BOTS_RATELIMIT_PATH ?? DEFAULT_PATH;
  const burst = Math.min(
    300,
    Math.max(10, Number.parseInt(process.env.BOTS_RATELIMIT_BURST ?? "90", 10) || 90),
  );
  return { path, burst };
}

export const RATE_LIMIT_FLOW: Flow = {
  name: "rate-limit",
  description:
    "Bursts a read-only rate-limited endpoint and asserts the limiter engages (429) and degrades cleanly (no 5xx).",
  steps: [
    {
      name: "rate-limit-engages",
      async run({ page, store, persona, config }) {
        const { path, burst } = probeConfig();
        const base = config.baseUrl.replace(/\/$/, "");
        const url = base + path;

        // Land on a real page first so the page context (and the post-flow
        // cross-cutting audit) has a meaningful URL rather than about:blank.
        await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => undefined);

        // Pre-flight: confirm the endpoint exists on this target.
        const probe = await page.request.get(url, { failOnStatusCode: false }).catch(() => null);
        if (!probe) {
          store.add({
            severity: "info",
            category: "rate-limit",
            title: `rate-limit probe could not reach ${path}`,
            detail: "The probe endpoint was unreachable (network/target issue); rate-limit checks skipped.",
            url,
            persona,
            signatureKey: "rate-limit:unreachable",
          });
          return;
        }
        if (probe.status() === 404) {
          store.add({
            severity: "info",
            category: "rate-limit",
            title: `rate-limit probe endpoint absent: ${path}`,
            detail: `${path} returned 404 on this target — set BOTS_RATELIMIT_PATH to a read-only rate-limited GET to probe.`,
            url,
            persona,
            signatureKey: "rate-limit:absent",
          });
          return;
        }

        // Fire the burst in parallel to actually exceed the per-window cap.
        const statuses: number[] = [];
        const retryAfter: (string | null)[] = [];
        const responses = await Promise.all(
          Array.from({ length: burst }, () =>
            page.request.get(url, { failOnStatusCode: false }).catch(() => null),
          ),
        );
        for (const r of responses) {
          if (!r) continue;
          statuses.push(r.status());
          if (r.status() === 429) retryAfter.push(r.headers()["retry-after"] ?? null);
        }

        const got429 = statuses.includes(429);
        const got5xx = statuses.some((s) => s >= 500);

        if (got5xx) {
          store.add({
            severity: "high",
            category: "rate-limit",
            title: `rate-limited endpoint ${path} returned 5xx under burst`,
            detail:
              `Bursting ${burst} requests at ${path} produced a 5xx (${statuses.filter((s) => s >= 500).length} of ${statuses.length}). ` +
              "Hitting a rate limit must be a clean 429, never a server crash.",
            url,
            persona,
            signatureKey: `rate-limit:5xx:${path}`,
          });
        }

        if (!got429) {
          store.add({
            severity: "medium",
            category: "rate-limit",
            title: `rate limiter did not engage on ${path}`,
            detail:
              `Sent ${statuses.length} rapid requests to ${path} and never saw a 429 (statuses seen: ` +
              `${[...new Set(statuses)].sort((a, b) => a - b).join(", ")}). The limiter may be misconfigured or ` +
              "disabled on this target, leaving the endpoint open to abuse.",
            url,
            persona,
            signatureKey: `rate-limit:no-429:${path}`,
          });
          return;
        }

        // 429 fired — good. Nudge for a Retry-After header if it's missing.
        if (retryAfter.length > 0 && retryAfter.every((v) => !v)) {
          store.add({
            severity: "low",
            category: "rate-limit",
            title: `429 on ${path} has no Retry-After header`,
            detail:
              "The limiter correctly returns 429 but without a Retry-After header, so well-behaved clients " +
              "can't compute a backoff. Adding Retry-After improves client behaviour and is cheap.",
            url,
            persona,
            signatureKey: `rate-limit:no-retry-after:${path}`,
          });
        }
      },
    },
  ],
};
