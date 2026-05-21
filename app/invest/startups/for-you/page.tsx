import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Startup Rounds For You | invest.com.au",
  description:
    "Personalised feed of open startup investment rounds matched to your thesis.",
  alternates: { canonical: `${SITE_URL}/invest/startups/for-you` },
};

type Thesis = {
  sector_tags?: string[];
  stage_preferences?: string[];
  min_ticket_aud?: number | null;
  max_ticket_aud?: number | null;
  geography?: string[];
};

type Round = {
  id: string;
  startup_id: string;
  instrument: string;
  status: string;
  target_aud_cents: number;
  raised_aud_cents: number;
  min_ticket_aud_cents: number;
  wholesale_only: boolean;
  closes_at: string | null;
  created_at: string;
};

type StartupProfile = {
  id: string;
  company_name: string;
  slug: string;
  stage: string;
  sector: string[];
  esic_verified_at: string | null;
};

type ScoredRound = Round & {
  startup: StartupProfile;
  matchScore: number;
};

function scoreRound(round: Round, startup: StartupProfile, thesis: Thesis | null): number {
  if (!thesis) return 0;
  let score = 0;

  const thesisSectors = new Set(thesis.sector_tags ?? []);
  if (thesisSectors.size > 0) {
    for (const s of startup.sector) {
      if (thesisSectors.has(s)) score += 10;
    }
  }

  const thesisStages = new Set(thesis.stage_preferences ?? []);
  if (thesisStages.size > 0 && thesisStages.has(startup.stage)) {
    score += 5;
  }

  return score;
}

function centsToAud(cents: number): string {
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}k`;
  return `$${(cents / 100).toFixed(0)}`;
}

function raisedPct(raised: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.round((raised / target) * 100));
}

const STAGE_LABELS: Record<string, string> = {
  pre_seed: "Pre-seed",
  seed: "Seed",
  series_a: "Series A",
  series_b_plus: "Series B+",
};

const INSTRUMENT_LABELS: Record<string, string> = {
  equity: "Equity",
  safe_note: "SAFE Note",
  convertible_note: "Convertible Note",
  revenue_share: "Revenue Share",
};

function MatchBadge({ score }: { score: number }) {
  if (score >= 15)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
        Strong match
      </span>
    );
  if (score >= 5)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
        Good match
      </span>
    );
  return null;
}

export default async function ForYouPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/account/login?redirect=/invest/startups/for-you`);

  // Parallel: thesis, wholesale cert, open rounds
  const [profileRes, certRes, roundsRes] = await Promise.all([
    supabase
      .from("investor_profiles")
      .select("meta")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
    supabase
      .from("wholesale_investor_certifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "verified")
      .maybeSingle(),
    supabase
      .from("startup_rounds")
      .select(
        "id, startup_id, instrument, status, target_aud_cents, raised_aud_cents, min_ticket_aud_cents, wholesale_only, closes_at, created_at",
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const meta = (profileRes.data?.meta as Record<string, unknown> | null) ?? {};
  const thesis = (meta.startup_thesis as Thesis | undefined) ?? null;
  const hasWholesaleCert = !!certRes.data;

  const openRounds = (roundsRes.data ?? []) as Round[];

  // Filter wholesale-only rounds
  const eligibleRounds = openRounds.filter(
    (r) => !r.wholesale_only || hasWholesaleCert,
  );

  // Fetch startup profiles for eligible rounds
  const startupIds = [...new Set(eligibleRounds.map((r) => r.startup_id))];
  let startupMap: Map<string, StartupProfile> = new Map();

  if (startupIds.length > 0) {
    const { data: profiles } = await supabase
      .from("startup_profiles")
      .select("id, company_name, slug, stage, sector, esic_verified_at")
      .in("id", startupIds)
      .eq("status", "active");

    for (const p of profiles ?? []) {
      startupMap.set(p.id, p as StartupProfile);
    }
  }

  // Score and rank
  const scored: ScoredRound[] = [];
  for (const round of eligibleRounds) {
    const startup = startupMap.get(round.startup_id);
    if (!startup) continue;
    const matchScore = scoreRound(round, startup, thesis);
    scored.push({ ...round, startup, matchScore });
  }

  // Sort: score DESC, then created_at DESC (most recent first as tiebreaker)
  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const hasThesis = thesis && (
    (thesis.sector_tags?.length ?? 0) > 0 ||
    (thesis.stage_preferences?.length ?? 0) > 0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <nav className="text-xs text-gray-500 mb-1">
            <Link href="/invest" className="hover:text-blue-600">Invest</Link>
            <span className="mx-1.5">/</span>
            <Link href="/invest/startups" className="hover:text-blue-600">Startups</Link>
            <span className="mx-1.5">/</span>
            <span>For You</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Startup rounds for you</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Open rounds matched to your investment thesis
              </p>
            </div>
            <Link
              href="/account/startup-thesis"
              className="text-xs text-blue-600 hover:underline shrink-0"
            >
              {hasThesis ? "Edit thesis" : "Set your thesis"}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {!hasThesis && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <p className="text-sm font-semibold text-blue-900 mb-1">Set your investment thesis</p>
            <p className="text-sm text-blue-700">
              Tell us which sectors, stages, and ticket sizes you prefer and we&apos;ll rank rounds
              to match your focus.
            </p>
            <Link
              href="/account/startup-thesis"
              className="inline-block mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Set thesis
            </Link>
          </div>
        )}

        {scored.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-600 font-medium mb-2">No open rounds right now</p>
            <p className="text-sm text-gray-400 mb-4">
              Check back soon — new rounds are added regularly.
            </p>
            <Link
              href="/invest/startups/listings"
              className="text-sm text-blue-600 hover:underline"
            >
              Browse all listings →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {scored.map((item) => {
              const pct = raisedPct(item.raised_aud_cents, item.target_aud_cents);
              return (
                <Link
                  key={item.id}
                  href={`/invest/startups/listings/${item.startup.slug}`}
                  className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold text-gray-900 truncate">
                          {item.startup.company_name}
                        </span>
                        {item.startup.esic_verified_at && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                            ESIC eligible
                          </span>
                        )}
                        {item.wholesale_only && (
                          <span className="inline-flex items-center text-[11px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full shrink-0">
                            Wholesale only
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-2">
                        <span>{STAGE_LABELS[item.startup.stage] ?? item.startup.stage}</span>
                        <span>·</span>
                        <span>{INSTRUMENT_LABELS[item.instrument] ?? item.instrument}</span>
                        {item.startup.sector.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="capitalize">{item.startup.sector[0]?.replace(/_/g, " ")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <MatchBadge score={item.matchScore} />
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {centsToAud(item.target_aud_cents)}
                      </p>
                      <p className="text-xs text-gray-400">target</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{centsToAud(item.raised_aud_cents)} raised</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {item.closes_at && (
                    <p className="text-[11px] text-gray-400 mt-2">
                      Closes {new Date(item.closes_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/invest/startups/listings" className="text-sm text-gray-500 hover:text-blue-600">
            View all startup listings →
          </Link>
        </div>
      </main>
    </div>
  );
}
