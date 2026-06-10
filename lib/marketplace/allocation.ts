// eslint-disable-next-line no-restricted-imports -- service-role legitimate per CLAUDE.md: allocation resolves placements on anonymous public-page renders (no JWT) and does cross-broker queries (campaigns/wallets/stats across all brokers) that can't be scoped to auth.uid()
import { createAdminClient } from "@/lib/supabase/admin";
import type { Campaign, MarketplacePlacement } from "@/lib/types";
import { debitWallet } from "./wallet";
import {
  computeQualityScores,
  effectiveRateCents,
  type CampaignQualityInputs,
} from "./quality-score";
import { logger } from "@/lib/logger";

const log = logger("allocation");

function getAdminClient() {
  return createAdminClient();
}

export interface WinningCampaign {
  campaign_id: number;
  broker_slug: string;
  inventory_type: "featured" | "cpc";
  rate_cents: number;
  placement_slug: string;
}

/** Context passed from callers for decision logging & attribution */
export interface AllocationContext {
  page?: string;
  scenario?: string;
  device_type?: string;
}

interface RejectionEntry {
  broker_slug: string;
  campaign_id: number;
  reason: string;
}

interface CandidateEntry {
  broker_slug: string;
  campaign_id: number;
  rate_cents: number;
  quality_multiplier?: number;
  effective_rate_cents?: number;
}

/**
 * Resolve the winning campaign(s) for a given placement.
 *
 * Algorithm (the hybrid auction: editorial filter → bid → quality):
 * 1. Find active campaigns for this placement (already admin-reviewed —
 *    the editorial filter happens at campaign approval)
 * 2. Filter out budget-exhausted, expired, below-reserve, daily-capped,
 *    suspended-broker, and wallet-empty campaigns
 * 3. Rank by quality-weighted effective rate (rate_cents × quality
 *    multiplier) DESC → priority DESC → created_at ASC. Quality is the
 *    campaign's 30-day CTR/CR relative to the competing cohort
 *    (lib/marketplace/quality-score.ts); cold-start campaigns are neutral.
 *    Billing always uses the stated rate_cents — quality affects rank only.
 * 4. Return top N (max_slots)
 * 5. Fallback: if no campaigns, returns empty array (callers fall back to sponsorship_tier)
 *
 * EVERY call is logged to allocation_decisions for auditability, including
 * each candidate's quality multiplier and effective rate.
 */
export async function getWinningCampaigns(
  placementSlug: string,
  brokerSlugs?: string[],
  context?: AllocationContext
): Promise<WinningCampaign[]> {
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  const supabase = getAdminClient();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const rejections: RejectionEntry[] = [];
  const allCandidates: CandidateEntry[] = [];

  // 1. Look up placement
  const { data: placement } = await supabase
    .from("marketplace_placements")
    .select("*")
    .eq("slug", placementSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!placement) {
    logDecision(supabase, {
      placement_slug: placementSlug,
      page: context?.page,
      scenario: context?.scenario,
      device_type: context?.device_type,
      candidates: [],
      winners: [],
      rejection_log: [{ broker_slug: "", campaign_id: 0, reason: "placement_not_found" }],
      winner_count: 0,
      candidate_count: 0,
      fallback_used: true,
      duration_ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime),
    });
    return [];
  }

  // 2. Query active campaigns for this placement
  // Note: For campaigns with bid_strategy='target_cpa', rate_cents is
  // automatically updated by the auto-bid optimizer cron. This means the
  // standard auction ranking works for both manual and auto-bid campaigns.
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

  if (!campaigns || campaigns.length === 0) {
    logDecision(supabase, {
      placement_slug: placementSlug,
      page: context?.page,
      scenario: context?.scenario,
      device_type: context?.device_type,
      candidates: [],
      winners: [],
      rejection_log: [],
      winner_count: 0,
      candidate_count: 0,
      fallback_used: true,
      duration_ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime),
    });
    return [];
  }

  // Record all candidates
  for (const c of campaigns as Campaign[]) {
    allCandidates.push({
      broker_slug: c.broker_slug,
      campaign_id: c.id,
      rate_cents: c.rate_cents,
    });
  }

  // 3. Filter out budget-exhausted, expired, and below-reserve campaigns.
  // The reserve (placement.base_rate_cents) is enforced client-side at
  // campaign creation, but rates and reserves can drift after approval —
  // this is the server-side safety net.
  const reserveCents = (placement as MarketplacePlacement).base_rate_cents || 0;
  const eligible: Campaign[] = [];
  for (const c of campaigns as Campaign[]) {
    if (c.total_budget_cents && c.total_spent_cents >= c.total_budget_cents) {
      rejections.push({ broker_slug: c.broker_slug, campaign_id: c.id, reason: "total_budget_exhausted" });
      continue;
    }
    if (c.end_date && c.end_date < today) {
      rejections.push({ broker_slug: c.broker_slug, campaign_id: c.id, reason: "end_date_passed" });
      continue;
    }
    if (reserveCents > 0 && c.rate_cents < reserveCents) {
      rejections.push({ broker_slug: c.broker_slug, campaign_id: c.id, reason: "below_reserve" });
      continue;
    }
    eligible.push(c);
  }

  if (eligible.length === 0) {
    logDecision(supabase, {
      placement_slug: placementSlug,
      page: context?.page,
      scenario: context?.scenario,
      device_type: context?.device_type,
      candidates: allCandidates,
      winners: [],
      rejection_log: rejections,
      winner_count: 0,
      candidate_count: allCandidates.length,
      fallback_used: true,
      duration_ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime),
    });
    return [];
  }

  // 4. Check daily budget — single batched query instead of N queries
  const todayStart = today + "T00:00:00.000Z";
  const withBudget: Campaign[] = [];

  // Collect campaign IDs that have daily budgets
  const dailyBudgetCampaignIds = eligible
    .filter((c) => c.daily_budget_cents)
    .map((c) => c.id);

  // Single query: fetch all today's events for all capped campaigns at once
  const todaySpendMap = new Map<number, number>();

  if (dailyBudgetCampaignIds.length > 0) {
    const { data: todayEvents } = await supabase
      .from("campaign_events")
      .select("campaign_id, cost_cents")
      .in("campaign_id", dailyBudgetCampaignIds)
      .gte("created_at", todayStart);

    // Aggregate spend per campaign in JS
    for (const e of todayEvents || []) {
      const prev = todaySpendMap.get(e.campaign_id) || 0;
      todaySpendMap.set(e.campaign_id, prev + (e.cost_cents || 0));
    }
  }

  for (const c of eligible) {
    if (c.daily_budget_cents) {
      const todaySpend = todaySpendMap.get(c.id) || 0;
      if (todaySpend >= c.daily_budget_cents) {
        rejections.push({ broker_slug: c.broker_slug, campaign_id: c.id, reason: "daily_budget_hit" });
        continue;
      }
    }
    withBudget.push(c);
  }

  if (withBudget.length === 0) {
    logDecision(supabase, {
      placement_slug: placementSlug,
      page: context?.page,
      scenario: context?.scenario,
      device_type: context?.device_type,
      candidates: allCandidates,
      winners: [],
      rejection_log: rejections,
      winner_count: 0,
      candidate_count: allCandidates.length,
      fallback_used: true,
      duration_ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime),
    });
    return [];
  }

  // 5. Check wallet balance > 0 AND broker account standing, in parallel.
  // The status gate rejects only on a positive "not active" signal —
  // a broker without a portal account row (legacy/admin-created campaigns)
  // is not penalised. Suspended and pending brokers must not serve.
  const brokerSlugsToCheck = [...new Set(withBudget.map((c) => c.broker_slug))];
  const [{ data: wallets }, { data: inactiveAccounts }] = await Promise.all([
    supabase
      .from("broker_wallets")
      .select("broker_slug, balance_cents")
      .in("broker_slug", brokerSlugsToCheck)
      .gt("balance_cents", 0),
    supabase
      .from("broker_accounts")
      .select("broker_slug, status")
      .in("broker_slug", brokerSlugsToCheck)
      .neq("status", "active"),
  ]);

  const fundedSlugs = new Set((wallets || []).map((w: { broker_slug: string }) => w.broker_slug));
  const inactiveSlugs = new Set(
    (inactiveAccounts || []).map((a: { broker_slug: string }) => a.broker_slug)
  );
  const funded: Campaign[] = [];

  for (const c of withBudget) {
    if (inactiveSlugs.has(c.broker_slug)) {
      rejections.push({ broker_slug: c.broker_slug, campaign_id: c.id, reason: "broker_not_active" });
    } else if (!fundedSlugs.has(c.broker_slug)) {
      rejections.push({ broker_slug: c.broker_slug, campaign_id: c.id, reason: "zero_wallet_balance" });
    } else {
      funded.push(c);
    }
  }

  if (funded.length === 0) {
    logDecision(supabase, {
      placement_slug: placementSlug,
      page: context?.page,
      scenario: context?.scenario,
      device_type: context?.device_type,
      candidates: allCandidates,
      winners: [],
      rejection_log: rejections,
      winner_count: 0,
      candidate_count: allCandidates.length,
      fallback_used: true,
      duration_ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime),
    });
    return [];
  }

  // 6. Quality-weighted re-rank: 30-day CTR/CR relative to this cohort.
  // Stats come from campaign_daily_stats (maintained by the marketplace-stats
  // cron). Campaigns without enough history score a neutral 1.0, so a fresh
  // campaign competes on its stated rate alone. Billing is untouched —
  // recordCpcClick always charges the DB rate_cents, never the effective rate.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const { data: statRows } = await supabase
    .from("campaign_daily_stats")
    .select("campaign_id, impressions, clicks, conversions")
    .in("campaign_id", funded.map((c) => c.id))
    .gte("stat_date", thirtyDaysAgo);

  const aggregates = new Map<number, CampaignQualityInputs>();
  for (const c of funded) {
    aggregates.set(c.id, {
      campaign_id: c.id,
      impressions_30d: 0,
      clicks_30d: 0,
      conversions_30d: 0,
    });
  }
  for (const s of (statRows || []) as {
    campaign_id: number;
    impressions: number | null;
    clicks: number | null;
    conversions: number | null;
  }[]) {
    const agg = aggregates.get(s.campaign_id);
    if (!agg) continue;
    agg.impressions_30d += s.impressions || 0;
    agg.clicks_30d += s.clicks || 0;
    agg.conversions_30d += s.conversions || 0;
  }

  const qualityScores = computeQualityScores([...aggregates.values()]);

  const ranked = funded
    .map((c) => {
      const multiplier = qualityScores.get(c.id)?.multiplier ?? 1.0;
      return { campaign: c, multiplier, effective: effectiveRateCents(c.rate_cents, multiplier) };
    })
    .sort(
      (a, b) =>
        b.effective - a.effective ||
        b.campaign.priority - a.campaign.priority ||
        a.campaign.created_at.localeCompare(b.campaign.created_at)
    );

  // Annotate candidates log with quality data for auditability
  for (const r of ranked) {
    const entry = allCandidates.find((c) => c.campaign_id === r.campaign.id);
    if (entry) {
      entry.quality_multiplier = r.multiplier;
      entry.effective_rate_cents = r.effective;
    }
  }

  // 7. Return top N winners
  const maxSlots = (placement as MarketplacePlacement).max_slots || 1;
  const winnersRanked = ranked.slice(0, maxSlots);

  // Log losers (campaigns that passed all filters but didn't get a slot)
  for (const loser of ranked.slice(maxSlots)) {
    rejections.push({
      broker_slug: loser.campaign.broker_slug,
      campaign_id: loser.campaign.id,
      reason: "outbid_no_slot",
    });
  }

  const winnerResult = winnersRanked.map((r) => ({
    campaign_id: r.campaign.id,
    broker_slug: r.campaign.broker_slug,
    inventory_type: r.campaign.inventory_type as "featured" | "cpc",
    rate_cents: r.campaign.rate_cents,
    placement_slug: placementSlug,
  }));

  // Log the full decision
  logDecision(supabase, {
    placement_slug: placementSlug,
    page: context?.page,
    scenario: context?.scenario,
    device_type: context?.device_type,
    candidates: allCandidates,
    winners: winnersRanked.map((r) => ({
      broker_slug: r.campaign.broker_slug,
      campaign_id: r.campaign.id,
      rate_cents: r.campaign.rate_cents,
      inventory_type: r.campaign.inventory_type,
      quality_multiplier: r.multiplier,
      effective_rate_cents: r.effective,
    })),
    rejection_log: rejections,
    winner_count: winnerResult.length,
    candidate_count: allCandidates.length,
    fallback_used: false,
    duration_ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime),
  });

  return winnerResult;
}

/**
 * Record an impression event for a campaign.
 */
export async function recordImpression(
  campaignId: string | number,
  brokerSlug: string,
  page?: string,
  extra?: { placement_id?: number; scenario?: string; device_type?: string }
): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from("campaign_events").insert({
    campaign_id: campaignId,
    broker_slug: brokerSlug,
    event_type: "impression",
    cost_cents: 0,
    page: page || null,
    placement_id: extra?.placement_id || null,
    scenario: extra?.scenario || null,
    device_type: extra?.device_type || null,
  });
}

/**
 * Record a click event for a CPC campaign.
 * Checks daily pacing before debit. Debits wallet and updates campaign total_spent.
 * Returns true if the click was recorded + billed, false if insufficient funds or daily cap hit.
 *
 * IDEMPOTENT: If the same click_id was already billed as a CPC click, returns true
 * without double-charging. A unique partial index on campaign_events(click_id)
 * WHERE event_type='click' enforces this at the DB level.
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
    placement_id?: number;
    scenario?: string;
    device_type?: string;
  }
): Promise<boolean> {
  const supabase = getAdminClient();

  // ── Idempotency: if this click_id was already billed, don't double-charge ──
  if (clickData.click_id) {
    const { data: existingClick } = await supabase
      .from("campaign_events")
      .select("id")
      .eq("click_id", clickData.click_id)
      .eq("event_type", "click")
      .maybeSingle();

    if (existingClick) {
      log.info(`Idempotent CPC: click_id ${clickData.click_id} already billed`, { eventId: existingClick.id });
      return true; // Already billed — don't charge again
    }
  }

  // Look up the campaign's actual rate and budget from the DB — never trust caller-supplied rate
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("daily_budget_cents, total_spent_cents, total_budget_cents, rate_cents, status")
    .eq("id", campaignId)
    .single();

  if (!campaign) return false;

  // Use the campaign's actual rate_cents from the DB, not the caller-supplied value
  const actualRateCents = campaign.rate_cents;
  if (!actualRateCents || actualRateCents <= 0) return false;
  if (campaign.status !== "active") return false;

  if (campaign.daily_budget_cents) {
    const todayStart = new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";
    const { data: todayEvents } = await supabase
      .from("campaign_events")
      .select("cost_cents")
      .eq("campaign_id", campaignId)
      .gte("created_at", todayStart);

    const todaySpend = (todayEvents || []).reduce(
      (sum: number, e: { cost_cents: number }) => sum + (e.cost_cents || 0),
      0
    );

    if (todaySpend + actualRateCents > campaign.daily_budget_cents) {
      return false; // Daily cap would be exceeded
    }
  }

  // Try to debit wallet using the verified rate from the database
  try {
    await debitWallet(
      brokerSlug,
      actualRateCents,
      `CPC click — campaign #${campaignId}`,
      { type: "campaign_click", id: String(campaignId) }
    );
  } catch {
    // Insufficient funds — don't record the click
    return false;
  }

  // Insert campaign event with full attribution data
  // The unique index on click_id WHERE event_type='click' catches any race condition
  const { error: insertErr } = await supabase.from("campaign_events").insert({
    campaign_id: campaignId,
    broker_slug: brokerSlug,
    event_type: "click",
    click_id: clickData.click_id || null,
    page: clickData.page || null,
    ip_hash: clickData.ip_hash || null,
    user_agent: clickData.user_agent || null,
    session_id: clickData.session_id || null,
    placement_id: clickData.placement_id || null,
    scenario: clickData.scenario || null,
    device_type: clickData.device_type || null,
    cost_cents: actualRateCents,
  });

  if (insertErr) {
    // If unique constraint violation, the click was already recorded (race condition)
    // Refund the wallet debit we just made
    if (insertErr.code === "23505") {
      log.info(`CPC race condition: click_id ${clickData.click_id} duplicate insert, refunding debit`);
      try {
        const { refundWallet } = await import("./wallet");
        await refundWallet(
          brokerSlug,
          actualRateCents,
          `Refund: duplicate CPC click — campaign #${campaignId}`,
          { type: "duplicate_click_refund", id: clickData.click_id || String(campaignId) }
        );
      } catch (refundErr) {
        log.error("Failed to refund duplicate CPC debit", { error: refundErr instanceof Error ? refundErr.message : String(refundErr) });
      }
      return true;
    }
    log.error("Campaign event insert error", { error: insertErr.message });
    return false;
  }

  // Update campaign total_spent
  const newSpent = (campaign.total_spent_cents || 0) + actualRateCents;
  const updates: Record<string, unknown> = {
    total_spent_cents: newSpent,
    updated_at: new Date().toISOString(),
  };

  // Auto-pause if total budget exhausted
  if (campaign.total_budget_cents && newSpent >= campaign.total_budget_cents) {
    updates.status = "budget_exhausted";
  }

  await supabase.from("campaigns").update(updates).eq("id", campaignId);

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

  const c = data[0] as Record<string, unknown>;
  // Check budget not exhausted
  if (
    typeof c.total_budget_cents === "number" &&
    typeof c.total_spent_cents === "number" &&
    c.total_spent_cents >= c.total_budget_cents
  )
    return null;
  // Check end date
  if (typeof c.end_date === "string" && c.end_date < today) return null;

  const placementData = Array.isArray(c.marketplace_placements)
    ? (c.marketplace_placements as Record<string, unknown>[])[0]
    : (c.marketplace_placements as Record<string, unknown>);

  return {
    campaign_id: c.id as number,
    broker_slug: c.broker_slug as string,
    inventory_type: "cpc",
    rate_cents: c.rate_cents as number,
    placement_slug: (placementData?.slug as string) || "",
  };
}

// ── Decision Logger (fire-and-forget) ──────────────────────────────

interface DecisionLogData {
  placement_slug: string;
  page?: string;
  scenario?: string;
  device_type?: string;
  candidates: CandidateEntry[];
  winners: {
    broker_slug: string;
    campaign_id: number;
    rate_cents: number;
    inventory_type?: string;
    quality_multiplier?: number;
    effective_rate_cents?: number;
  }[];
  rejection_log: RejectionEntry[];
  winner_count: number;
  candidate_count: number;
  fallback_used: boolean;
  duration_ms: number;
}

function logDecision(
  supabase: { from: (table: string) => { insert: (data: Record<string, unknown>) => { select: () => unknown } } },
  data: DecisionLogData
): void {
  // Fire-and-forget — allocation latency must not increase
  (async () => {
    try {
      await supabase
        .from("allocation_decisions")
        .insert({
          placement_slug: data.placement_slug,
          page: data.page || null,
          scenario: data.scenario || null,
          device_type: data.device_type || null,
          candidates: JSON.stringify(data.candidates),
          winners: JSON.stringify(data.winners),
          rejection_log: JSON.stringify(data.rejection_log),
          winner_count: data.winner_count,
          candidate_count: data.candidate_count,
          fallback_used: data.fallback_used,
          duration_ms: data.duration_ms,
        });
    } catch (err) {
      log.error("Failed to log allocation decision", { error: err instanceof Error ? err.message : String(err) });
    }
  })();
}
