import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";

export const runtime = "edge";
export const maxDuration = 60;

const log = logger("cron-refresh-revenue-view");

/**
 * Cron: Refresh Revenue-Weighted Broker Scores (runs daily at 2am AEST)
 *
 * Updates affiliate_priority based on CPA value:
 *   - $200+ CPA → high
 *   - $50-$199 CPA → medium
 *   - <$50 CPA → low
 *
 * Also revalidates ISR cache for comparison and homepage pages.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  // Update affiliate_priority based on cpa_value
  const updates = await Promise.allSettled([
    supabase
      .from("brokers")
      .update({ affiliate_priority: "high" })
      .gte("cpa_value", 200)
      .eq("status", "active"),
    supabase
      .from("brokers")
      .update({ affiliate_priority: "medium" })
      .gte("cpa_value", 50)
      .lt("cpa_value", 200)
      .eq("status", "active"),
    supabase
      .from("brokers")
      .update({ affiliate_priority: "low" })
      .lt("cpa_value", 50)
      .eq("status", "active")
      .not("cpa_value", "is", null),
  ]);

  const errors = updates.filter((r) => r.status === "rejected");
  if (errors.length > 0) {
    log.error("Some priority updates failed", { count: errors.length });
  }

  // Trigger Next.js ISR revalidation for key pages
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";
  const revalidateSecret = process.env.REVALIDATE_SECRET;

  if (revalidateSecret) {
    const paths = ["/", "/compare", "/deals"];
    await Promise.allSettled(
      paths.map((path) =>
        fetch(`${siteUrl}/api/revalidate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret: revalidateSecret, path }),
        })
      )
    );
    log.info("ISR revalidation triggered for key pages");
  }

  log.info("Revenue view refresh complete");

  return NextResponse.json({
    success: true,
    errors: errors.length,
    timestamp: new Date().toISOString(),
  });
}
