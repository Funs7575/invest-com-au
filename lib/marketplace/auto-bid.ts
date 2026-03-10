import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("auto-bid");

function getAdminClient() {
  return createAdminClient();
}

export interface BidAdjustment {
  campaign_id: number;
  broker_slug: string;
  old_bid_cents: number;
  new_bid_cents: number;
  reason: string;
  metrics: {
    historical_cpa_cents: number | null;
    target_cpa_cents: number;
    clicks_30d: number;
    conversions_30d: number;
    conversion_rate: number;
  };
}

/**
 * Calculate the optimal CPC bid to achieve a target CPA.
 *
 * Formula: optimal_bid = target_cpa * conversion_rate
 *
 * Example: If target CPA is $10 and conversion rate is 5%,
 * optimal bid = $10 * 0.05 = $0.50 per click
 *
 * Safeguards:
 * - Minimum 7 days of data before auto-adjusting
 * - Minimum 20 clicks before calculating conversion rate
 * - Bid changes capped at +/-25% per adjustment to avoid wild swings
 * - Respects auto_bid_min_cents and auto_bid_max_cents bounds
 * - Falls back to conservative bid if insufficient data
 */
export async function calculateOptimalBids(): Promise<BidAdjustment[]> {
  const supabase = getAdminClient();
  const adjustments: BidAdjustment[] = [];

  // Fetch all active campaigns with target_cpa bid strategy
  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select(
      "id, broker_slug, rate_cents, target_cpa_cents, auto_bid_min_cents, auto_bid_max_cents, auto_bid_current_cents, created_at"
    )
    .eq("status", "active")
    .eq("bid_strategy", "target_cpa")
    .not("target_cpa_cents", "is", null);

  if (campaignsErr) {
    log.error("Failed to fetch auto-bid campaigns", { error: campaignsErr.message });
    return adjustments;
  }

  if (!campaigns || campaigns.length === 0) return adjustments;

  log.info(`Processing ${campaigns.length} auto-bid campaigns`);

  // Get 30-day stats for these campaigns
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  const campaignIds = campaigns.map((c) => c.id);

  const { data: stats, error: statsErr } = await supabase
    .from("campaign_daily_stats")
    .select("campaign_id, clicks, conversions, spend_cents")
    .in("campaign_id", campaignIds)
    .gte("stat_date", thirtyDaysAgo);

  if (statsErr) {
    log.error("Failed to fetch campaign daily stats", { error: statsErr.message });
    return adjustments;
  }

  // Aggregate stats per campaign
  const statsMap = new Map<
    number,
    { clicks: number; conversions: number; spend_cents: number; days: number }
  >();
  for (const s of stats || []) {
    const existing = statsMap.get(s.campaign_id) || {
      clicks: 0,
      conversions: 0,
      spend_cents: 0,
      days: 0,
    };
    existing.clicks += s.clicks;
    existing.conversions += s.conversions || 0;
    existing.spend_cents += s.spend_cents;
    existing.days++;
    statsMap.set(s.campaign_id, existing);
  }

  for (const campaign of campaigns) {
    const agg = statsMap.get(campaign.id);
    const currentBid = campaign.auto_bid_current_cents || campaign.rate_cents;
    const targetCpa = campaign.target_cpa_cents;
    const minBid = campaign.auto_bid_min_cents || 5;
    // Default max = target CPA itself (never bid more than target CPA per click)
    const maxBid = campaign.auto_bid_max_cents || targetCpa;

    // Need minimum data to calculate a meaningful conversion rate
    if (!agg || agg.days < 7 || agg.clicks < 20) {
      // Not enough data — set a conservative initial bid.
      // Use 10% of target CPA as starting point (assumes ~10% conversion rate).
      const conservativeBid = Math.max(Math.round(targetCpa * 0.1), minBid);
      const clampedBid = Math.min(Math.max(conservativeBid, minBid), maxBid);

      if (clampedBid !== currentBid) {
        adjustments.push({
          campaign_id: campaign.id,
          broker_slug: campaign.broker_slug,
          old_bid_cents: currentBid,
          new_bid_cents: clampedBid,
          reason: "insufficient_data_conservative_bid",
          metrics: {
            historical_cpa_cents: null,
            target_cpa_cents: targetCpa,
            clicks_30d: agg?.clicks || 0,
            conversions_30d: agg?.conversions || 0,
            conversion_rate: 0,
          },
        });
      }
      continue;
    }

    const convRate = agg.conversions / agg.clicks;
    const historicalCpa =
      agg.conversions > 0 ? Math.round(agg.spend_cents / agg.conversions) : null;

    // Calculate optimal bid: target_cpa * conversion_rate
    let optimalBid: number;
    if (convRate > 0) {
      optimalBid = Math.round(targetCpa * convRate);
    } else {
      // No conversions yet — reduce bid to gather cheaper clicks
      optimalBid = Math.max(Math.round(currentBid * 0.75), minBid);
    }

    // Cap change at +/-25% per adjustment to avoid wild swings
    const maxIncrease = Math.round(currentBid * 1.25);
    const maxDecrease = Math.round(currentBid * 0.75);
    optimalBid = Math.min(optimalBid, maxIncrease);
    optimalBid = Math.max(optimalBid, maxDecrease);

    // Clamp to min/max bounds
    optimalBid = Math.min(Math.max(optimalBid, minBid), maxBid);

    // Only adjust if meaningful change (>2 cents difference)
    if (Math.abs(optimalBid - currentBid) < 3) continue;

    let reason = "optimal_bid_adjustment";
    if (historicalCpa && historicalCpa > targetCpa * 1.2) {
      reason = "cpa_above_target_reducing_bid";
    } else if (historicalCpa && historicalCpa < targetCpa * 0.8) {
      reason = "cpa_below_target_increasing_bid";
    } else if (agg.conversions === 0) {
      reason = "no_conversions_reducing_bid";
    }

    adjustments.push({
      campaign_id: campaign.id,
      broker_slug: campaign.broker_slug,
      old_bid_cents: currentBid,
      new_bid_cents: optimalBid,
      reason,
      metrics: {
        historical_cpa_cents: historicalCpa,
        target_cpa_cents: targetCpa,
        clicks_30d: agg.clicks,
        conversions_30d: agg.conversions,
        // percentage with 2 decimal places
        conversion_rate: Math.round(convRate * 10000) / 100,
      },
    });
  }

  return adjustments;
}

/**
 * Apply bid adjustments to the database.
 * Updates auto_bid_current_cents and rate_cents for auto-bid campaigns.
 */
export async function applyBidAdjustments(
  adjustments: BidAdjustment[]
): Promise<number> {
  if (adjustments.length === 0) return 0;

  const supabase = getAdminClient();
  let applied = 0;

  for (const adj of adjustments) {
    const { error } = await supabase
      .from("campaigns")
      .update({
        auto_bid_current_cents: adj.new_bid_cents,
        rate_cents: adj.new_bid_cents, // Update the actual bid used in allocation
        auto_bid_last_adjusted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", adj.campaign_id)
      .eq("bid_strategy", "target_cpa"); // Safety check — only update auto-bid campaigns

    if (!error) {
      applied++;
      log.info(`Auto-bid adjusted: campaign #${adj.campaign_id}`, {
        old: adj.old_bid_cents,
        new: adj.new_bid_cents,
        reason: adj.reason,
      });
    } else {
      log.error(`Failed to apply bid adjustment for campaign #${adj.campaign_id}`, {
        error: error.message,
      });
    }
  }

  // Log all adjustments as broker notifications
  for (const adj of adjustments) {
    const direction =
      adj.old_bid_cents > adj.new_bid_cents ? "decreased" : "increased";
    const oldDollars = (adj.old_bid_cents / 100).toFixed(2);
    const newDollars = (adj.new_bid_cents / 100).toFixed(2);
    const reasonText = adj.reason.replace(/_/g, " ");

    await supabase
      .from("broker_notifications")
      .insert({
        broker_slug: adj.broker_slug,
        type: "auto_bid_adjustment",
        title: "Auto-Bid Adjusted",
        message: `Campaign #${adj.campaign_id}: Bid ${direction} from $${oldDollars} to $${newDollars}/click. ${reasonText}. 30d stats: ${adj.metrics.clicks_30d} clicks, ${adj.metrics.conversions_30d} conversions (${adj.metrics.conversion_rate}% conv rate).`,
        link: "/broker-portal/campaigns",
        is_read: false,
        email_sent: false,
      })
      .then(({ error }) => {
        if (error)
          log.error("Failed to insert bid adjustment notification", {
            error: error.message,
          });
      });
  }

  return applied;
}
