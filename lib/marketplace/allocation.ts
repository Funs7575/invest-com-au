import { createClient } from "@supabase/supabase-js";
import type { Campaign, MarketplacePlacement } from "@/lib/types";
import { debitWallet } from "./wallet";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface WinningCampaign {
  campaign_id: number;
  broker_slug: string;
  inventory_type: "featured" | "cpc";
  rate_cents: number;
  placement_slug: string;
}

/**
 * Resolve the winning campaign(s) for a given placement.
 *
 * Algorithm:
 * 1. Find active campaigns for this placement
 * 2. Filter out budget-exhausted and wallet-empty campaigns
 * 3. Rank by rate_cents DESC → priority DESC → created_at ASC
 * 4. Return top N (max_slots)
 * 5. Fallback: if no campaigns, returns empty array (callers fall back to sponsorship_tier)
 */
export async function getWinningCampaigns(
  placementSlug: string,
  brokerSlugs?: string[]
): Promise<WinningCampaign[]> {
  const supabase = getAdminClient();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 1. Look up placement
  const { data: placement } = await supabase
    .from("marketplace_placements")
    .select("*")
    .eq("slug", placementSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!placement) return [];

  // 2. Query active campaigns for this placement
  let query = supabase
    .from("campaigns")
    .select("*")
    .eq("placement_id", placement.id)
    .eq("status", "active")
    .lte("start_date", today)
    .order("rate_cents", { ascending: false })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (brokerSlugs && brokerSlugs.length > 0) {
    query = query.in("broker_slug", brokerSlugs);
  }

  const { data: campaigns } = await query;
  if (!campaigns || campaigns.length === 0) return [];

  // 3. Filter out budget-exhausted campaigns
  const eligible: Campaign[] = [];
  for (const c of campaigns as Campaign[]) {
    // Total budget check
    if (c.total_budget_cents && c.total_spent_cents >= c.total_budget_cents) continue;
    // End date check
    if (c.end_date && c.end_date < today) continue;
    eligible.push(c);
  }

  if (eligible.length === 0) return [];

  // 4. Check daily budget (query today's spend from campaign_events)
  const todayStart = today + "T00:00:00.000Z";
  const withBudget: Campaign[] = [];

  for (const c of eligible) {
    if (c.daily_budget_cents) {
      const { data: todayEvents } = await supabase
        .from("campaign_events")
        .select("cost_cents")
        .eq("campaign_id", c.id)
        .gte("created_at", todayStart);

      const todaySpend = (todayEvents || []).reduce(
        (sum: number, e: { cost_cents: number }) => sum + (e.cost_cents || 0),
        0
      );

      if (todaySpend >= c.daily_budget_cents) continue;
    }
    withBudget.push(c);
  }

  if (withBudget.length === 0) return [];

  // 5. Check wallet balance > 0
  const brokerSlugsToCheck = [...new Set(withBudget.map((c) => c.broker_slug))];
  const { data: wallets } = await supabase
    .from("broker_wallets")
    .select("broker_slug, balance_cents")
    .in("broker_slug", brokerSlugsToCheck)
    .gt("balance_cents", 0);

  const fundedSlugs = new Set((wallets || []).map((w: { broker_slug: string }) => w.broker_slug));
  const funded = withBudget.filter((c) => fundedSlugs.has(c.broker_slug));

  if (funded.length === 0) return [];

  // 6. Return top N winners
  const maxSlots = (placement as MarketplacePlacement).max_slots || 1;
  const winners = funded.slice(0, maxSlots);

  return winners.map((c) => ({
    campaign_id: c.id,
    broker_slug: c.broker_slug,
    inventory_type: c.inventory_type,
    rate_cents: c.rate_cents,
    placement_slug: placementSlug,
  }));
}

/**
 * Record an impression event for a campaign.
 */
export async function recordImpression(
  campaignId: number,
  brokerSlug: string,
  page?: string
): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from("campaign_events").insert({
    campaign_id: campaignId,
    broker_slug: brokerSlug,
    event_type: "impression",
    cost_cents: 0,
    page: page || null,
  });
}

/**
 * Record a click event for a CPC campaign.
 * Debits the wallet and updates campaign total_spent.
 * Returns true if the click was recorded + billed, false if insufficient funds.
 */
export async function recordCpcClick(
  campaignId: number,
  brokerSlug: string,
  rateCents: number,
  clickData: {
    click_id?: string;
    page?: string;
    ip_hash?: string;
    user_agent?: string;
    session_id?: string;
  }
): Promise<boolean> {
  const supabase = getAdminClient();

  // Try to debit wallet
  try {
    await debitWallet(
      brokerSlug,
      rateCents,
      `CPC click — campaign #${campaignId}`,
      { type: "campaign_click", id: String(campaignId) }
    );
  } catch {
    // Insufficient funds — don't record the click
    return false;
  }

  // Insert campaign event
  await supabase.from("campaign_events").insert({
    campaign_id: campaignId,
    broker_slug: brokerSlug,
    event_type: "click",
    click_id: clickData.click_id || null,
    page: clickData.page || null,
    ip_hash: clickData.ip_hash || null,
    user_agent: clickData.user_agent || null,
    session_id: clickData.session_id || null,
    cost_cents: rateCents,
  });

  // Update campaign total_spent
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("total_spent_cents, total_budget_cents")
    .eq("id", campaignId)
    .single();

  if (campaign) {
    const newSpent = (campaign.total_spent_cents || 0) + rateCents;
    const updates: Record<string, any> = {
      total_spent_cents: newSpent,
      updated_at: new Date().toISOString(),
    };

    // Auto-pause if budget exhausted
    if (campaign.total_budget_cents && newSpent >= campaign.total_budget_cents) {
      updates.status = "budget_exhausted";
    }

    await supabase.from("campaigns").update(updates).eq("id", campaignId);
  }

  return true;
}

/**
 * Get active CPC campaign for a specific broker on a specific placement.
 * Used by the /go/ redirect to find which campaign to bill.
 */
export async function getActiveCpcCampaign(
  brokerSlug: string,
  placementSlug?: string
): Promise<WinningCampaign | null> {
  const supabase = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("campaigns")
    .select("*, marketplace_placements!inner(slug)")
    .eq("broker_slug", brokerSlug)
    .eq("status", "active")
    .eq("inventory_type", "cpc")
    .lte("start_date", today)
    .order("rate_cents", { ascending: false })
    .limit(1);

  if (placementSlug) {
    query = query.eq("marketplace_placements.slug", placementSlug);
  }

  const { data } = await query;
  if (!data || data.length === 0) return null;

  const c = data[0] as any;
  // Check budget not exhausted
  if (c.total_budget_cents && c.total_spent_cents >= c.total_budget_cents) return null;
  // Check end date
  if (c.end_date && c.end_date < today) return null;

  const placementData = Array.isArray(c.marketplace_placements)
    ? c.marketplace_placements[0]
    : c.marketplace_placements;

  return {
    campaign_id: c.id,
    broker_slug: c.broker_slug,
    inventory_type: "cpc",
    rate_cents: c.rate_cents,
    placement_slug: placementData?.slug || "",
  };
}
