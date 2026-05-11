import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";

const log = logger("cron:quarterly-anonymity-audit");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/quarterly-anonymity-audit
 *
 * CL-10: Quarterly live-page anonymity audit (runs on first day of each
 * quarter via Vercel cron — see vercel.json). Fetches a representative
 * sample of public pages and scans their HTML for founder PII patterns
 * (`finn@invest.com.au`, `finnduns@gmail.com`, `Finn Webster`). If any
 * match is found the digest is emailed to OPS_ALERT_EMAIL so it can be
 * resolved before the next quarter.
 *
 * This is the runtime complement to the CI-gate (CL-09) that scans
 * source at PR time. It catches PII that could enter through DB content,
 * author profiles, or template rendering that the static grep misses.
 */

const PII_PATTERNS = [
  /finn@invest\.com\.au/i,
  /finnduns@gmail\.com/i,
  /Finn Webster/,
];

const PROBE_TIMEOUT_MS = 10_000;
const ALERT_RECIPIENT = process.env.OPS_ALERT_EMAIL || "ops@invest.com.au";

interface PageResult {
  url: string;
  hits: string[];
  error: string | null;
}

async function probePage(url: string): Promise<PageResult> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { "User-Agent": "invest.com.au anonymity-audit-bot/1.0" },
    });
    if (!res.ok) {
      return { url, hits: [], error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const hits: string[] = [];
    for (const pattern of PII_PATTERNS) {
      const match = html.match(pattern);
      if (match) hits.push(match[0]);
    }
    return { url, hits, error: null };
  } catch (err) {
    return {
      url,
      hits: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(request: NextRequest) {
  requireCronAuth(request);

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : new URL(request.url).origin);

  const pagesToProbe = [
    `${origin}/`,
    `${origin}/about`,
    `${origin}/methodology`,
    `${origin}/how-we-verify`,
    `${origin}/brokers`,
    `${origin}/sitemap.xml`,
  ];

  log.info("starting anonymity audit probes", { pageCount: pagesToProbe.length });

  const results = await Promise.all(pagesToProbe.map(probePage));

  const violations = results.filter((r) => r.hits.length > 0);
  const errors = results.filter((r) => r.error !== null && r.hits.length === 0);

  log.info("anonymity audit complete", {
    violations: violations.length,
    errors: errors.length,
  });

  if (violations.length > 0) {
    const rows = violations
      .map(
        (v) =>
          `<tr><td style="padding:4px 8px;border:1px solid #ddd">${v.url}</td>` +
          `<td style="padding:4px 8px;border:1px solid #ddd;color:#b91c1c">${v.hits.map((h) => `<code>${h}</code>`).join(", ")}</td></tr>`,
      )
      .join("\n");

    await sendEmail({
      to: ALERT_RECIPIENT,
      subject: `[ACTION REQUIRED] Quarterly anonymity audit: ${violations.length} PII violation(s) detected`,
      html: `
        <p>The quarterly anonymity audit found founder PII on <strong>${violations.length}</strong> live page(s).</p>
        <p>These must be resolved before the next quarter to maintain founder anonymity per the CL stream audit requirements.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <thead><tr>
            <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Page</th>
            <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">PII found</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#6b7280;font-size:12px">Sent by /api/cron/quarterly-anonymity-audit</p>
      `,
    });
    log.warn("anonymity violations found — digest sent", { violations });
  }

  return NextResponse.json({
    ok: true,
    probed: pagesToProbe.length,
    violations: violations.length,
    errors: errors.length,
    results: results.map((r) => ({
      url: r.url,
      clean: r.hits.length === 0 && r.error === null,
      hits: r.hits,
      error: r.error,
    })),
  });
}
