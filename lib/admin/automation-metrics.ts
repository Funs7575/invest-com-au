/**
 * Aggregation layer for the admin automation dashboard.
 *
 * Every feature tile + drill-down reads from one of these functions.
 * Split out so the overview page and the individual drill-down pages
 * show consistent numbers — there's one source of truth per metric.
 *
 * Runs server-side in admin pages (uses createAdminClient) so the
 * dashboard never exposes raw table queries to the browser.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ─── Feature identifiers ────────────────────────────────────────────
// Single source of truth for the 13 features the dashboard tracks.
// Used as tile keys, cron names, drill-down slugs.
export const AUTOMATION_FEATURES = [
  "lead_disputes",
  "advisor_applications",
  "listing_scam",
  "text_moderation",
  "lead_sla",
  "profile_gate_drip",
  "advisor_dunning",
  "broker_data_changes",
  "marketplace_campaigns",
  "afsl_expiry",
  "email_bounces",
  "monthly_reports",
  "quality_weights",
] as const;

export type AutomationFeature = (typeof AUTOMATION_FEATURES)[number];

export interface FeatureDisplay {
  key: AutomationFeature;
  title: string;
  cronName: string | null; // null if feature isn't cron-driven
  description: string;
  slug: string; // /admin/automation/<slug>
}

export const FEATURE_CONFIG: Record<AutomationFeature, FeatureDisplay> = {
  lead_disputes: {
    key: "lead_disputes",
    title: "Lead dispute auto-resolver",
    cronName: "auto-resolve-disputes",
    description: "Classifies advisor lead disputes and auto-refunds/rejects where confidence is high",
    slug: "disputes",
  },
  advisor_applications: {
    key: "advisor_applications",
    title: "Advisor application verification",
    cronName: null,
    description: "AFSL + ABN register lookups on new advisor applications",
    slug: "applications",
  },
  listing_scam: {
    key: "listing_scam",
    title: "Investment listing scam classifier",
    cronName: null,
    description: "Rule-based fraud detection on user-submitted investment listings",
    slug: "listings",
  },
  text_moderation: {
    key: "text_moderation",
    title: "Review & article moderation",
    cronName: null,
    description: "Text classifier for broker reviews, advisor reviews, switch stories, Q&A and advisor articles",
    slug: "moderation",
  },
  lead_sla: {
    key: "lead_sla",
    title: "Lead SLA enforcement",
    cronName: "enforce-lead-sla",
    description: "Warns then auto-pauses advisors with unresponded leads",
    slug: "sla",
  },
  profile_gate_drip: {
    key: "profile_gate_drip",
    title: "Profile quality gate drip",
    cronName: "advisor-profile-gate-drip",
    description: "Email drip for advisors stuck at the profile quality gate",
    slug: "profile-gates",
  },
  advisor_dunning: {
    key: "advisor_dunning",
    title: "Stripe auto-topup dunning",
    cronName: "advisor-dunning",
    description: "Retry + escalate failed advisor credit top-up charges",
    slug: "dunning",
  },
  broker_data_changes: {
    key: "broker_data_changes",
    title: "Broker data change auto-approval",
    cronName: null,
    description: "Tiers broker profile edits into auto-apply, reviewable, admin-required",
    slug: "broker-changes",
  },
  marketplace_campaigns: {
    key: "marketplace_campaigns",
    title: "Marketplace campaign auto-approval",
    cronName: null,
    description: "Auto-approves clean creative from trusted brokers with valid budget",
    slug: "campaigns",
  },
  afsl_expiry: {
    key: "afsl_expiry",
    title: "AFSL expiry monitor",
    cronName: "afsl-expiry-monitor",
    description: "Weekly ASIC register re-check for every active advisor",
    slug: "afsl-expiry",
  },
  email_bounces: {
    key: "email_bounces",
    title: "Email bounce auto-suppression",
    cronName: "email-bounce-sweep",
    description: "Resend bounce pull + suppression list + drip scrub",
    slug: "email-suppression",
  },
  monthly_reports: {
    key: "monthly_reports",
    title: "Monthly advisor reports",
    cronName: "monthly-advisor-reports",
    description: "Monthly performance email per advisor with percentile ranks",
    slug: "monthly-reports",
  },
  quality_weights: {
    key: "quality_weights",
    title: "Lead quality weights feedback",
    cronName: "lead-quality-weights",
    description: "Nightly recomputation of signal weights from observed conversions",
    slug: "quality-weights",
  },
};

// ─── Core metric shapes ──────────────────────────────────────────────

export interface LatestCronRun {
  name: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  status: "running" | "ok" | "error" | "partial" | "never_run";
  stats: Record<string, unknown> | null;
  errorMessage: string | null;
  triggeredBy: string | null;
}

export interface FeatureOverview {
  feature: AutomationFeature;
  display: FeatureDisplay;
  pending: number; // items waiting for human review (escalated queue)
  lastRun: LatestCronRun | null; // null if not cron-driven
  health: "green" | "amber" | "red" | "unknown";
  recentCounts: {
    autoActed: number; // refund + reject + approve + publish verdicts
    escalated: number;
    rejected: number;
    approved: number;
    refunded: number;
    total: number;
  };
}

// ─── Latest cron run lookup ──────────────────────────────────────────

/**
 * Fetch the most recent cron_run_log row for a given cron name.
 * Returns null if the table doesn't exist or there's no row — the
 * dashboard renders that as "never_run" rather than failing the page.
 */
export async function getLatestCronRun(cronName: string): Promise<LatestCronRun> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cron_run_log")
    .select("name, started_at, ended_at, duration_ms, status, stats, error_message, triggered_by")
    .eq("name", cronName)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      name: cronName,
      startedAt: null,
      endedAt: null,
      durationMs: null,
      status: "never_run",
      stats: null,
      errorMessage: null,
      triggeredBy: null,
    };
  }

  return {
    name: data.name,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    durationMs: data.duration_ms,
    status: (data.status as LatestCronRun["status"]) || "never_run",
    stats: (data.stats as Record<string, unknown> | null) || null,
    errorMessage: data.error_message || null,
    triggeredBy: data.triggered_by || null,
  };
}

/**
 * Compute the overall health colour for a feature given its latest
 * cron run + pending queue depth.
 *
 *   green  — ran successfully within the feature's expected cadence
 *            AND pending queue is under the "needs attention" threshold
 *   amber  — ran with partial success OR queue is getting large
 *            OR hasn't run for >1 cadence window but <2
 *   red    — last run errored OR hasn't run for >2 cadence windows
 *            OR pending queue is way over threshold
 *   unknown — not cron-driven AND no recent decisions to evaluate
 */
export function computeHealth(
  lastRun: LatestCronRun | null,
  pending: number,
  expectedCadenceHours: number,
  queueWarn: number,
  queueCritical: number,
): "green" | "amber" | "red" | "unknown" {
  // RED conditions take priority — any single red signal wins.
  if (pending >= queueCritical) return "red";
  if (lastRun?.status === "error") return "red";
  if (lastRun?.startedAt) {
    const ageHours = (Date.now() - new Date(lastRun.startedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > expectedCadenceHours * 2) return "red";
  }

  // AMBER conditions — degraded but not broken.
  if (pending >= queueWarn) return "amber";
  if (lastRun?.status === "partial") return "amber";
  if (lastRun?.startedAt) {
    const ageHours = (Date.now() - new Date(lastRun.startedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > expectedCadenceHours * 1.25) return "amber";
  }

  // No run history at all — unknown. Queue-based warn/red checks
  // above would have caught anything above the warn threshold, so
  // reaching here with no lastRun means everything is fine or we
  // simply have no data to evaluate.
  if (!lastRun || lastRun.status === "never_run") {
    return "unknown";
  }

  return "green";
}

// ─── Per-feature metric functions ────────────────────────────────────

/**
 * Lead dispute metrics — pulls the last 7 days of lead_disputes
 * activity and aggregates by verdict.
 */
export async function getLeadDisputeOverview(): Promise<FeatureOverview> {
  const supabase = createAdminClient();
  const display = FEATURE_CONFIG.lead_disputes;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingRes, recentRes, lastRun] = await Promise.all([
    supabase
      .from("lead_disputes")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("lead_disputes")
      .select("auto_resolved_verdict, status, refunded_cents")
      .gte("created_at", sevenDaysAgo),
    display.cronName ? getLatestCronRun(display.cronName) : Promise.resolve(null),
  ]);

  const recent = recentRes.data || [];
  const recentCounts = {
    autoActed: recent.filter((d) => d.auto_resolved_verdict === "refund" || d.auto_resolved_verdict === "reject").length,
    escalated: recent.filter((d) => d.auto_resolved_verdict === "escalate").length,
    rejected: recent.filter((d) => d.status === "rejected").length,
    approved: recent.filter((d) => d.status === "approved").length,
    refunded: recent.reduce((acc, d) => acc + ((d.refunded_cents as number | null) || 0), 0),
    total: recent.length,
  };

  return {
    feature: "lead_disputes",
    display,
    pending: pendingRes.count || 0,
    lastRun,
    health: computeHealth(lastRun, pendingRes.count || 0, 1, 20, 50),
    recentCounts,
  };
}

export async function getAdvisorApplicationOverview(): Promise<FeatureOverview> {
  const supabase = createAdminClient();
  const display = FEATURE_CONFIG.advisor_applications;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingRes, recentRes] = await Promise.all([
    supabase
      .from("advisor_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("advisor_applications")
      .select("status, reviewed_by")
      .gte("created_at", sevenDaysAgo),
  ]);

  const recent = recentRes.data || [];
  const autoReviewed = recent.filter((r) => r.reviewed_by === "auto");

  return {
    feature: "advisor_applications",
    display,
    pending: pendingRes.count || 0,
    lastRun: null,
    health: computeHealth(null, pendingRes.count || 0, 24, 20, 50),
    recentCounts: {
      autoActed: autoReviewed.filter((r) => r.status === "approved" || r.status === "rejected").length,
      escalated: recent.filter((r) => r.status === "pending").length,
      rejected: recent.filter((r) => r.status === "rejected").length,
      approved: recent.filter((r) => r.status === "approved").length,
      refunded: 0,
      total: recent.length,
    },
  };
}

export async function getListingScamOverview(): Promise<FeatureOverview> {
  const supabase = createAdminClient();
  const display = FEATURE_CONFIG.listing_scam;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingRes, recentRes] = await Promise.all([
    supabase
      .from("investment_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("investment_listings")
      .select("status, auto_classified_verdict")
      .gte("created_at", sevenDaysAgo),
  ]);

  const recent = recentRes.data || [];
  return {
    feature: "listing_scam",
    display,
    pending: pendingRes.count || 0,
    lastRun: null,
    health: computeHealth(null, pendingRes.count || 0, 24, 30, 100),
    recentCounts: {
      autoActed: recent.filter((r) => r.auto_classified_verdict === "auto_approve" || r.auto_classified_verdict === "auto_reject").length,
      escalated: recent.filter((r) => r.auto_classified_verdict === "escalate").length,
      rejected: recent.filter((r) => r.auto_classified_verdict === "auto_reject").length,
      approved: recent.filter((r) => r.auto_classified_verdict === "auto_approve").length,
      refunded: 0,
      total: recent.length,
    },
  };
}

export async function getTextModerationOverview(): Promise<FeatureOverview> {
  const supabase = createAdminClient();
  const display = FEATURE_CONFIG.text_moderation;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingBroker, pendingAdvisor, brokerRecent, advisorRecent] = await Promise.all([
    supabase.from("user_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("professional_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("user_reviews").select("auto_moderated_verdict, status").gte("created_at", sevenDaysAgo),
    supabase.from("professional_reviews").select("auto_moderated_verdict, status").gte("created_at", sevenDaysAgo),
  ]);

  const allRecent = [...(brokerRecent.data || []), ...(advisorRecent.data || [])];
  const pending = (pendingBroker.count || 0) + (pendingAdvisor.count || 0);

  return {
    feature: "text_moderation",
    display,
    pending,
    lastRun: null,
    health: computeHealth(null, pending, 24, 40, 150),
    recentCounts: {
      autoActed: allRecent.filter((r) => r.auto_moderated_verdict === "auto_publish" || r.auto_moderated_verdict === "auto_reject").length,
      escalated: allRecent.filter((r) => r.auto_moderated_verdict === "escalate").length,
      rejected: allRecent.filter((r) => r.auto_moderated_verdict === "auto_reject").length,
      approved: allRecent.filter((r) => r.auto_moderated_verdict === "auto_publish").length,
      refunded: 0,
      total: allRecent.length,
    },
  };
}

async function cronOnlyOverview(
  feature: AutomationFeature,
  expectedCadenceHours: number,
  queueQuery: () => Promise<number>,
): Promise<FeatureOverview> {
  const display = FEATURE_CONFIG[feature];
  const [pending, lastRun] = await Promise.all([
    queueQuery(),
    display.cronName ? getLatestCronRun(display.cronName) : Promise.resolve(null),
  ]);

  return {
    feature,
    display,
    pending,
    lastRun,
    health: computeHealth(lastRun, pending, expectedCadenceHours, 20, 50),
    recentCounts: {
      autoActed: (lastRun?.stats?.warned1 as number | undefined) || 0,
      escalated: 0,
      rejected: 0,
      approved: 0,
      refunded: 0,
      total: 0,
    },
  };
}

export async function getLeadSlaOverview(): Promise<FeatureOverview> {
  const supabase = createAdminClient();
  return cronOnlyOverview("lead_sla", 24, async () => {
    const { count } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("status", "paused")
      .eq("auto_pause_reason", "sla_miss");
    return count || 0;
  });
}

export async function getProfileGateOverview(): Promise<FeatureOverview> {
  const supabase = createAdminClient();
  return cronOnlyOverview("profile_gate_drip", 24, async () => {
    const { count } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("profile_quality_gate", "pending");
    return count || 0;
  });
}

export async function getDunningOverview(): Promise<FeatureOverview> {
  const supabase = createAdminClient();
  return cronOnlyOverview("advisor_dunning", 24, async () => {
    const { count } = await supabase
      .from("advisor_credit_topups")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed");
    return count || 0;
  });
}

export async function getBrokerChangesOverview(): Promise<FeatureOverview> {
  const supabase = createAdminClient();
  const display = FEATURE_CONFIG.broker_data_changes;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingRes, recentRes] = await Promise.all([
    supabase
      .from("broker_data_changes")
      .select("id", { count: "exact", head: true })
      .is("auto_applied_at", null)
      .is("applied_at", null),
    supabase
      .from("broker_data_changes")
      .select("auto_applied_tier, auto_applied_at")
      .gte("created_at", sevenDaysAgo),
  ]);

  const recent = recentRes.data || [];
  const applied = recent.filter((r) => r.auto_applied_at !== null);

  return {
    feature: "broker_data_changes",
    display,
    pending: pendingRes.count || 0,
    lastRun: null,
    health: computeHealth(null, pendingRes.count || 0, 24, 30, 100),
    recentCounts: {
      autoActed: applied.filter((r) => r.auto_applied_tier !== "require_admin").length,
      escalated: recent.filter((r) => r.auto_applied_tier === "require_admin" || r.auto_applied_tier === null).length,
      rejected: 0,
      approved: applied.length,
      refunded: 0,
      total: recent.length,
    },
  };
}

export async function getMarketplaceCampaignOverview(): Promise<FeatureOverview> {
  const supabase = createAdminClient();
  const display = FEATURE_CONFIG.marketplace_campaigns;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingRes, recentRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("campaigns")
      .select("status")
      .gte("created_at", sevenDaysAgo),
  ]);

  const recent = recentRes.data || [];
  return {
    feature: "marketplace_campaigns",
    display,
    pending: pendingRes.count || 0,
    lastRun: null,
    health: computeHealth(null, pendingRes.count || 0, 24, 15, 40),
    recentCounts: {
      autoActed: recent.filter((r) => r.status === "active" || r.status === "rejected").length,
      escalated: recent.filter((r) => r.status === "pending").length,
      rejected: recent.filter((r) => r.status === "rejected").length,
      approved: recent.filter((r) => r.status === "active").length,
      refunded: 0,
      total: recent.length,
    },
  };
}

export async function getAfslExpiryOverview(): Promise<FeatureOverview> {
  const supabase = createAdminClient();
  return cronOnlyOverview("afsl_expiry", 168 /* weekly */, async () => {
    const { count } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .in("auto_pause_reason", ["afsl_ceased", "afsl_suspended"]);
    return count || 0;
  });
}

export async function getEmailBouncesOverview(): Promise<FeatureOverview> {
  const supabase = createAdminClient();
  const display = FEATURE_CONFIG.email_bounces;
  const [pendingRes, lastRun] = await Promise.all([
    supabase.from("email_suppression_list").select("email", { count: "exact", head: true }),
    display.cronName ? getLatestCronRun(display.cronName) : Promise.resolve(null),
  ]);

  return {
    feature: "email_bounces",
    display,
    pending: pendingRes.count || 0,
    lastRun,
    health: computeHealth(lastRun, 0, 24, Infinity, Infinity),
    recentCounts: {
      autoActed: (lastRun?.stats?.pulled_from_resend as number | undefined) || 0,
      escalated: 0,
      rejected: 0,
      approved: 0,
      refunded: 0,
      total: pendingRes.count || 0,
    },
  };
}

export async function getMonthlyReportsOverview(): Promise<FeatureOverview> {
  const display = FEATURE_CONFIG.monthly_reports;
  const lastRun = display.cronName ? await getLatestCronRun(display.cronName) : null;
  return {
    feature: "monthly_reports",
    display,
    pending: 0,
    lastRun,
    health: computeHealth(lastRun, 0, 720 /* monthly */, Infinity, Infinity),
    recentCounts: {
      autoActed: (lastRun?.stats?.emailed as number | undefined) || 0,
      escalated: 0,
      rejected: 0,
      approved: 0,
      refunded: 0,
      total: (lastRun?.stats?.scanned as number | undefined) || 0,
    },
  };
}

export async function getQualityWeightsOverview(): Promise<FeatureOverview> {
  const display = FEATURE_CONFIG.quality_weights;
  const supabase = createAdminClient();
  const [lastRun, versionRes] = await Promise.all([
    display.cronName ? getLatestCronRun(display.cronName) : Promise.resolve(null),
    supabase
      .from("lead_quality_weights")
      .select("model_version")
      .order("model_version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    feature: "quality_weights",
    display,
    pending: 0,
    lastRun,
    health: computeHealth(lastRun, 0, 24, Infinity, Infinity),
    recentCounts: {
      autoActed: (lastRun?.stats?.signals_computed as number | undefined) || 0,
      escalated: 0,
      rejected: 0,
      approved: 0,
      refunded: 0,
      total: (versionRes.data?.model_version as number | undefined) || 0,
    },
  };
}

// ─── Overview dispatcher ─────────────────────────────────────────────

/**
 * Fetch overview metrics for every feature in parallel.
 * Used by the /admin/automation index page.
 */
export async function getAllFeatureOverviews(): Promise<FeatureOverview[]> {
  const results = await Promise.all([
    getLeadDisputeOverview().catch((e) => safeFallback("lead_disputes", e)),
    getAdvisorApplicationOverview().catch((e) => safeFallback("advisor_applications", e)),
    getListingScamOverview().catch((e) => safeFallback("listing_scam", e)),
    getTextModerationOverview().catch((e) => safeFallback("text_moderation", e)),
    getLeadSlaOverview().catch((e) => safeFallback("lead_sla", e)),
    getProfileGateOverview().catch((e) => safeFallback("profile_gate_drip", e)),
    getDunningOverview().catch((e) => safeFallback("advisor_dunning", e)),
    getBrokerChangesOverview().catch((e) => safeFallback("broker_data_changes", e)),
    getMarketplaceCampaignOverview().catch((e) => safeFallback("marketplace_campaigns", e)),
    getAfslExpiryOverview().catch((e) => safeFallback("afsl_expiry", e)),
    getEmailBouncesOverview().catch((e) => safeFallback("email_bounces", e)),
    getMonthlyReportsOverview().catch((e) => safeFallback("monthly_reports", e)),
    getQualityWeightsOverview().catch((e) => safeFallback("quality_weights", e)),
  ]);
  return results;
}

/**
 * Safe fallback used when a single feature metric query fails —
 * the dashboard still renders, one tile shows "unknown" instead
 * of crashing the whole page.
 */
function safeFallback(feature: AutomationFeature, err: unknown): FeatureOverview {
  const display = FEATURE_CONFIG[feature];
  // Narrow the error shape without crashing on non-Error throwables
  const message = err instanceof Error ? err.message : String(err);
  return {
    feature,
    display,
    pending: 0,
    lastRun: {
      name: display.cronName || feature,
      startedAt: null,
      endedAt: null,
      durationMs: null,
      status: "never_run",
      stats: { error: message },
      errorMessage: message,
      triggeredBy: null,
    },
    health: "unknown",
    recentCounts: {
      autoActed: 0,
      escalated: 0,
      rejected: 0,
      approved: 0,
      refunded: 0,
      total: 0,
    },
  };
}
