/**
 * lib/profile-share.ts
 *
 * Read path for investor profile share tokens.
 *
 * `getProfileShare(token)` is called from the /shared-profile/[token] page
 * and the API read route. It returns the investor's snapshot only when:
 *   1. The token exists.
 *   2. The token has not expired.
 *
 * Unlike investor_handoffs, profile shares are NOT consumed (single-read)
 * by default — the investor may share the link with multiple advisors. Instead
 * `consumed_at` is stamped on the FIRST read to signal "this has been viewed".
 * Subsequent reads still succeed but `wasConsumedPreviously` is true.
 *
 * The admin client is required because:
 *   - The token is accessed anonymously (no JWT from the viewing advisor).
 *   - profile_share_tokens has deny-all-anon RLS; the token is the auth factor.
 */

// eslint-disable-next-line no-restricted-imports -- anonymous-path exception: advisor viewing a share link has no JWT; opaque token acts as auth factor. profile_share_tokens is deny-all-anon (no anon SELECT). Mirrors investor_handoffs pattern in lib/investor-handoff.ts.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("lib:profile-share");

export interface WatchlistItem {
  item_type: string;
  item_slug: string;
  display_name: string | null;
}

export interface QuizResult {
  inferred_vertical: string | null;
  top_match_slug: string | null;
  completed_at: string | null;
}

export interface HealthScore {
  overall: number;
  diversification: number;
  cost: number;
  risk_alignment: number;
  engagement: number;
  scored_month: string;
}

export interface InvestorGoals {
  is_fhb: boolean;
  is_pre_retiree: boolean;
  is_business_owner: boolean;
  is_cross_border: boolean;
  is_hnw: boolean;
  budget_band: string | null;
  experience_level: string | null;
  primary_vertical: string | null;
  display_name: string | null;
}

export interface ProfileShareSnapshot {
  goals: InvestorGoals | null;
  quiz: QuizResult | null;
  watchlist: WatchlistItem[];
  health: HealthScore | null;
  created_at: string;
}

export interface ProfileShareResult {
  snapshot: ProfileShareSnapshot;
  wasConsumedPreviously: boolean;
  expiresAt: string;
}

export async function getProfileShare(token: string): Promise<ProfileShareResult | null> {
  if (!token || token.length > 200) return null;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profile_share_tokens")
    .select("id, snapshot_json, expires_at, consumed_at, created_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    log.warn("profile share lookup failed", { error: error.message });
    return null;
  }
  if (!data) return null;

  if (new Date(data.expires_at as string) < new Date()) return null;

  const wasConsumedPreviously = data.consumed_at != null;

  // Stamp consumed_at on first read (best-effort — don't block on failure).
  if (!wasConsumedPreviously) {
    const { error: updateError } = await admin
      .from("profile_share_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (updateError) {
      log.warn("profile share consumed_at stamp failed", {
        error: updateError.message,
        id: data.id,
      });
    }
  }

  const raw = (data.snapshot_json ?? {}) as Record<string, unknown>;

  const goals = _parseGoals(raw.goals);
  const quiz = _parseQuiz(raw.quiz);
  const health = _parseHealth(raw.health);
  const watchlist = _parseWatchlist(raw.watchlist);

  return {
    snapshot: {
      goals,
      quiz,
      watchlist,
      health,
      created_at: String(data.created_at ?? ""),
    },
    wasConsumedPreviously,
    expiresAt: String(data.expires_at ?? ""),
  };
}

function _parseGoals(raw: unknown): InvestorGoals | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    is_fhb: Boolean(r.is_fhb),
    is_pre_retiree: Boolean(r.is_pre_retiree),
    is_business_owner: Boolean(r.is_business_owner),
    is_cross_border: Boolean(r.is_cross_border),
    is_hnw: Boolean(r.is_hnw),
    budget_band: r.budget_band == null ? null : String(r.budget_band),
    experience_level: r.experience_level == null ? null : String(r.experience_level),
    primary_vertical: r.primary_vertical == null ? null : String(r.primary_vertical),
    display_name: r.display_name == null ? null : String(r.display_name),
  };
}

function _parseQuiz(raw: unknown): QuizResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    inferred_vertical: r.inferred_vertical == null ? null : String(r.inferred_vertical),
    top_match_slug: r.top_match_slug == null ? null : String(r.top_match_slug),
    completed_at: r.completed_at == null ? null : String(r.completed_at),
  };
}

function _parseHealth(raw: unknown): HealthScore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    overall: Number(r.overall ?? 0),
    diversification: Number(r.diversification ?? 0),
    cost: Number(r.cost ?? 0),
    risk_alignment: Number(r.risk_alignment ?? 0),
    engagement: Number(r.engagement ?? 0),
    scored_month: String(r.scored_month ?? ""),
  };
}

function _parseWatchlist(raw: unknown): WatchlistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown) => {
    const r = (item ?? {}) as Record<string, unknown>;
    return {
      item_type: String(r.item_type ?? ""),
      item_slug: String(r.item_slug ?? ""),
      display_name: r.display_name == null ? null : String(r.display_name),
    };
  });
}
