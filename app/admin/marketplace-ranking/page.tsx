import { redirect } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadRankingWeights,
  scoreProvider,
  sortByScore,
  type RankableProvider,
  type RankingSurface,
} from "@/lib/marketplace-ranking";
import type { ProSubscriptionTier } from "@/lib/pro-subscription";
import MarketplaceRankingClient, {
  type WeightRow,
} from "./MarketplaceRankingClient";

export const dynamic = "force-dynamic";

interface DbWeightRow {
  id: number;
  surface: RankingSurface;
  signal: string;
  weight_bps: number;
  enabled: boolean;
  notes: string | null;
  updated_at: string | null;
}

interface ProfessionalRow {
  id: number;
  slug: string;
  name: string;
  verified: boolean | null;
  outcome_score: number | null;
  response_latency_hours: number | null;
  subscription_tier: ProSubscriptionTier | null;
  rating: number | null;
}

interface PreviewEntry {
  slug: string;
  name: string;
  score: number;
}

/**
 * /admin/marketplace-ranking
 *
 * Admin-tunable weights for the /marketplace ranking model. Each row in
 * `marketplace_ranking_weights` is `(surface, signal, weight_bps, enabled,
 * notes)`. The page lists two tables — one per surface — and a live
 * preview block that scores the top-5 active professionals using the
 * weights currently saved in the DB so admins can see the effect.
 *
 * Edits go through POST /api/admin/marketplace-ranking, which UPSERTs by
 * (surface, signal). Defaults from `lib/marketplace-ranking/index.ts`
 * keep ranking deterministic when the table is empty.
 */
export default async function AdminMarketplaceRankingPage() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin");

  const supabase = createAdminClient();
  const { data: rowData } = await supabase
    .from("marketplace_ranking_weights")
    .select("id, surface, signal, weight_bps, enabled, notes, updated_at")
    .order("surface", { ascending: true })
    .order("signal", { ascending: true });

  const rows = (rowData as DbWeightRow[] | null) || [];

  const advisorRows: WeightRow[] = rows
    .filter((r) => r.surface === "advisors")
    .map(toClient);
  const teamRows: WeightRow[] = rows
    .filter((r) => r.surface === "teams")
    .map(toClient);

  // Live preview — score top professionals for each surface using the
  // weights currently in the DB. If the table is empty we fall back to
  // the defaults (which is what /marketplace itself would use).
  const advisorPreview = await buildPreview("advisors", supabase);
  const teamPreview = await buildPreview("teams", supabase);

  return (
    <AdminShell title="Marketplace ranking" subtitle="Tune how /marketplace surfaces score and sort providers. Changes apply on next request.">
      <MarketplaceRankingClient
        advisorRows={advisorRows}
        teamRows={teamRows}
        advisorPreview={advisorPreview}
        teamPreview={teamPreview}
      />
    </AdminShell>
  );
}

function toClient(r: DbWeightRow): WeightRow {
  return {
    id: r.id,
    surface: r.surface,
    signal: r.signal,
    weight_bps: r.weight_bps,
    enabled: r.enabled,
    notes: r.notes ?? "",
    updated_at: r.updated_at ?? null,
  };
}

async function buildPreview(
  surface: RankingSurface,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<PreviewEntry[]> {
  // /teams isn't a distinct table yet; both surfaces preview against the
  // professionals listing — keeps the preview honest with what the public
  // /marketplace pages actually rank.
  const { data } = await supabase
    .from("professionals")
    .select(
      "id, slug, name, verified, outcome_score, response_latency_hours, subscription_tier, rating",
    )
    .eq("status", "active")
    .limit(50);

  const pros = ((data as ProfessionalRow[] | null) || []).map(
    (p): RankableProvider & { slug: string; name: string } => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      verified: p.verified,
      outcome_score: p.outcome_score,
      response_latency_hours: p.response_latency_hours,
      subscription_tier: p.subscription_tier,
      rating: p.rating,
    }),
  );

  const weights = await loadRankingWeights(surface);
  const sorted = sortByScore(pros, weights).slice(0, 5);
  return sorted.map((p) => ({
    slug: p.slug,
    name: p.name,
    score: Number(scoreProvider(p, weights).toFixed(3)),
  }));
}
