/**
 * Public read for country rule alerts.
 *
 * GET /api/country-rule-alerts?country=uk
 *   → { alerts: PublicRuleAlert[] }
 *
 * Read-only. The CountryRuleAlerts client component calls this on mount
 * after reading the iv_intent_country cookie. Unknown / missing country
 * returns an empty list (200) so the banner gracefully renders nothing.
 *
 * Caching: 5-minute stale-while-revalidate on the edge — alerts change
 * a few times per quarter via /admin/country-rule-alerts; visitors are
 * tolerant of brief staleness.
 */

import { NextRequest, NextResponse } from "next/server";
import { getActiveAlertsForCountry } from "@/lib/country-rule-alerts-server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get("country") ?? "";
  const alerts = await getActiveAlertsForCountry(country);
  return NextResponse.json(
    { alerts },
    {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
