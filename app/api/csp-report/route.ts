import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("csp-report");

export const runtime = "nodejs";

// Shape of the csp-report object browsers send via report-uri (legacy format).
// The Reporting API v1 format wraps this in an array; both are handled below.
interface CspReport {
  "document-uri"?: string;
  referrer?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  "original-policy"?: string;
  "blocked-uri"?: string;
  "status-code"?: number;
  "source-file"?: string;
  "line-number"?: number;
  "column-number"?: number;
  disposition?: string;
}

/**
 * POST /api/csp-report
 *
 * Receives Content-Security-Policy violation reports sent automatically by
 * browsers when a CSP violation is detected. The proxy.ts middleware sets
 * the `report-to` CSP directive and the `Report-To` header pointing here.
 *
 * No authentication required — this endpoint is called by the browser, not
 * by authenticated users. Rate-limited per IP to blunt synthetic floods.
 *
 * Browsers send:
 *   - application/csp-report (legacy report-uri format): {"csp-report":{…}}
 *   - application/reports+json (Reporting API v1): [{type:"csp-violation",body:{…}}]
 */
export async function POST(request: NextRequest) {
  // 60 reports/min per IP. Generous enough to capture noisy violation bursts
  // on pages with many inline scripts, but blunts a synthetic write flood.
  if (
    !(await isAllowed("csp_report", ipKey(request), {
      max: 60,
      refillPerSec: 1,
    }))
  ) {
    return new NextResponse(null, { status: 429 });
  }

  let report: CspReport = {};
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const raw = await request.text();
    const parsed = JSON.parse(raw) as unknown;

    if (contentType.includes("application/reports+json")) {
      // Reporting API v1: array of report objects, each with a `body`.
      const item = Array.isArray(parsed) ? parsed[0] : parsed;
      report = ((item as Record<string, unknown>)?.body ?? {}) as CspReport;
    } else {
      // Legacy report-uri: {"csp-report": {…}}
      report = ((parsed as Record<string, unknown>)?.["csp-report"] ??
        {}) as CspReport;
    }
  } catch {
    // Unparseable body — return 204 so the browser does not retry.
    return new NextResponse(null, { status: 204 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("csp_violations").insert({
    document_uri: report["document-uri"] ?? null,
    referrer: report["referrer"] ?? null,
    violated_directive: report["violated-directive"] ?? null,
    effective_directive: report["effective-directive"] ?? null,
    original_policy: report["original-policy"] ?? null,
    blocked_uri: report["blocked-uri"] ?? null,
    status_code: report["status-code"] ?? null,
    source_file: report["source-file"] ?? null,
    line_number: report["line-number"] ?? null,
    column_number: report["column-number"] ?? null,
    disposition: report["disposition"] ?? null,
    user_agent: request.headers.get("user-agent") ?? null,
  });

  if (error) {
    log.warn({ error, blocked_uri: report["blocked-uri"] }, "failed to persist CSP violation report");
  }

  // 204 No Content — browsers ignore the response body.
  return new NextResponse(null, { status: 204 });
}
