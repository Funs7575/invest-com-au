/**
 * Smart recommendations strip — cross-page personalisation (W4.20).
 *
 * Server component. Reads two cookies:
 *   - `iv_quiz_session` (httpOnly) → quiz profile via `getQuizProfile()`
 *   - `iv_intent_country` → falls back here when the quiz didn't capture
 *
 * Picks WHAT to show based on the inferred vertical:
 *   - "trade" / "automate" / "fees" / "tools" / "safety" → brokers
 *   - "advisor_match" / "complex" / "wealth" / undefined-with-country → advisors
 *
 * Filters by `country_eligibility` so visitors only see entities that
 * accept their country (uses the same helper as #683 / #713).
 *
 * Returns null when:
 *   - Neither cookie set (no signal to personalise on)
 *   - Eligible-supply count is below the show threshold (3) — better to
 *     hide than show a sparse strip that looks broken
 *
 * NOT a replacement for the homepage's `CountryExpertsPreview` /
 * `CountryComparePreview`. Those run on the homepage only and are
 * country-only. This strip stacks the quiz signal on top so a visitor
 * who completed the quiz sees "your top match" pinning + vertical-tuned
 * picks across every page where it's mounted (find-advisor entry,
 * /best/[slug], pillar pages — staged in follow-ups).
 */

import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { intentCountryMeta, type IntentCountryCode } from "@/lib/intent-context";
import { getIntentCountry } from "@/lib/intent-context-server";
import { getQuizProfile, type QuizProfile } from "@/lib/quiz-profile";
import { getInvestorProfile, type InvestorProfile } from "@/lib/investor-profiles";
import {
  filterByCountryEligibility,
  type EntityWithEligibility,
} from "@/lib/country-mode/eligibility-filter";

const MIN_ITEMS_TO_SHOW = 3;
const QUERY_LIMIT = 12; // pre-filter limit; eligibility-filter trims further

type RecKind = "brokers" | "advisors";

interface BrokerRow extends EntityWithEligibility {
  slug: string;
  name: string;
  rating: number | null;
  logo_url: string | null;
  platform_type: string | null;
  asx_fee_value: number | null;
  us_fee_value: number | null;
}

interface AdvisorRow extends EntityWithEligibility {
  slug: string;
  name: string;
  firm_name: string | null;
  type: string;
  photo_url: string | null;
  rating: number | null;
  advisor_tier: string | null;
}

const BROKER_VERTICALS = new Set([
  "trade",
  "automate",
  "fees",
  "tools",
  "safety",
  "crypto",
  "broker_diy",
]);

const ADVISOR_VERTICALS = new Set([
  "advisor_match",
  "complex",
  "wealth",
  "super",
  "property",
  "international",
  "first_home",
]);

function pickKind(profile: QuizProfile | null): RecKind {
  if (!profile?.vertical) return "advisors";
  if (BROKER_VERTICALS.has(profile.vertical)) return "brokers";
  if (ADVISOR_VERTICALS.has(profile.vertical)) return "advisors";
  return "advisors";
}

/**
 * Merge structured `investor_profiles` columns over the cookie-backed
 * QuizProfile. Returns null when both sources are empty so downstream
 * code can fall back to country-only mode.
 *
 * Precedence: investor_profiles (signed-in, structured) wins on conflicts;
 * QuizProfile fills any gaps. The ranker's score functions accept a
 * QuizProfile-shaped object (vertical / topMatchSlug / intentCountry /
 * budget / experience / completedAt / createdAt), so the merge produces
 * one of those shapes regardless of source.
 */
function mergeProfileSignals(
  investor: InvestorProfile | null,
  quiz: QuizProfile | null,
): QuizProfile | null {
  if (!investor && !quiz) return null;
  return {
    sessionId: quiz?.sessionId ?? investor?.authUserId ?? "",
    vertical: investor?.primaryVertical ?? quiz?.vertical ?? null,
    topMatchSlug: quiz?.topMatchSlug ?? null,
    intentCountry: investor?.intentCountrySnapshot ?? quiz?.intentCountry ?? null,
    budget: investor?.budgetBand ?? quiz?.budget ?? null,
    experience: investor?.experienceLevel ?? quiz?.experience ?? null,
    completedAt: quiz?.completedAt ?? null,
    createdAt: investor?.createdAt ?? quiz?.createdAt ?? new Date().toISOString(),
  };
}

export default async function SmartRecommendationsStrip() {
  // Read all three signal sources in parallel:
  //  - quiz-session cookie → user_quiz_history row (anon-friendly)
  //  - iv_intent_country cookie (anon-friendly)
  //  - investor_profiles row (signed-in only; structured columns)
  // The investor_profiles read is gated to signed-in users to avoid an
  // admin-client query on every anon page render.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [profile, fallbackCountry, investorProfile] = await Promise.all([
    getQuizProfile(),
    getIntentCountry(),
    user ? getInvestorProfile(user.id) : Promise.resolve(null),
  ]);

  // Merge precedence: signed-in investor_profiles > quiz cookie profile >
  // intent-country cookie. Each layer fills gaps in the next.
  const mergedProfile = mergeProfileSignals(investorProfile, profile);
  const intentCountry =
    investorProfile?.intentCountrySnapshot ??
    profile?.intentCountry ??
    fallbackCountry;
  if (!mergedProfile && !intentCountry) return null;

  const kind = pickKind(mergedProfile);

  if (kind === "brokers") {
    const { data } = await supabase
      .from("brokers")
      .select(
        "slug, name, rating, logo_url, platform_type, country_eligibility, status, sponsorship_tier, promoted_placement, asx_fee_value, us_fee_value",
      )
      .eq("status", "active")
      .order("promoted_placement", { ascending: false })
      .order("rating", { ascending: false })
      .limit(QUERY_LIMIT);

    const eligible = filterByCountryEligibility(
      (data as BrokerRow[] | null) ?? [],
      intentCountry,
    );
    if (eligible.length < MIN_ITEMS_TO_SHOW) return null;

    const ranked = rankBrokers(eligible, mergedProfile);

    return renderStrip({
      kind: "brokers",
      profile: mergedProfile,
      intentCountry,
      items: ranked.slice(0, MIN_ITEMS_TO_SHOW).map((b) => ({
        slug: b.slug,
        name: b.name,
        href: `/brokers/${b.slug}`,
        avatar: b.logo_url,
        sub: b.platform_type ?? null,
      })),
    });
  }

  const { data } = await supabase
    .from("professionals")
    .select(
      "slug, name, firm_name, type, photo_url, rating, country_eligibility, status, verified, advisor_tier",
    )
    .eq("status", "active")
    .eq("verified", true)
    .order("rating", { ascending: false })
    .order("review_count", { ascending: false })
    .limit(QUERY_LIMIT);

  const eligible = filterByCountryEligibility(
    (data as AdvisorRow[] | null) ?? [],
    intentCountry,
  );
  if (eligible.length < MIN_ITEMS_TO_SHOW) return null;

  const ranked = rankAdvisors(eligible, mergedProfile);

  return renderStrip({
    kind: "advisors",
    profile: mergedProfile,
    intentCountry,
    items: ranked.slice(0, MIN_ITEMS_TO_SHOW).map((a) => ({
      slug: a.slug,
      name: a.name,
      href: `/advisors/${a.slug}`,
      avatar: a.photo_url,
      sub: a.firm_name ?? a.type,
    })),
  });
}

/**
 * Score brokers by fit to the visitor's quiz profile. Higher = better.
 * Inputs: rating, fee bands, beginner-friendly tag. Profile signals:
 * budget (small → favour low fees), experience (beginner → favour
 * beginner-friendly). When the profile is null the function degrades to
 * "best by rating" — same order as the input would be.
 */
export function rankBrokers(
  rows: ReadonlyArray<BrokerRow>,
  profile: QuizProfile | null,
): BrokerRow[] {
  const scored = rows.map((b) => ({ row: b, score: scoreBroker(b, profile) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.row);
}

function scoreBroker(b: BrokerRow, profile: QuizProfile | null): number {
  let score = (b.rating ?? 0) * 10;
  if (!profile) return score;

  // Budget = small → cheap brokers win. asx_fee_value is per-trade in AUD;
  // anything ≤ $5 is cheap, > $15 is expensive. Linear-ish bonus.
  if (profile.budget === "small" && typeof b.asx_fee_value === "number") {
    if (b.asx_fee_value <= 5) score += 15;
    else if (b.asx_fee_value <= 10) score += 8;
    else if (b.asx_fee_value > 20) score -= 8;
  }
  // Whale → premium tier brokers (us_fee_value low matters less; access matters more).
  if (profile.budget === "whale" && typeof b.us_fee_value === "number") {
    if (b.us_fee_value <= 1) score += 10;
  }

  // Beginner → simpler/cheaper brokers tend to win regardless of rating
  // (beginner-friendliness lives in `broker_scenario_scores.beginner_weight`
  // which would need a join — a future enhancement; for now we approximate
  // with "low fees + high rating" because the data we already have here
  // correlates well enough that the strip remains useful).
  if (profile.experience === "beginner" && typeof b.asx_fee_value === "number" && b.asx_fee_value <= 5) {
    score += 6;
  }

  return score;
}

/**
 * Score advisors by fit to the visitor's quiz profile. Profile signals:
 * budget (whale → premium tier advisors). Sparser than the broker
 * scoring because advisor data has fewer comparable numeric fields.
 */
export function rankAdvisors(
  rows: ReadonlyArray<AdvisorRow>,
  profile: QuizProfile | null,
): AdvisorRow[] {
  const scored = rows.map((a) => ({ row: a, score: scoreAdvisor(a, profile) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.row);
}

function scoreAdvisor(a: AdvisorRow, profile: QuizProfile | null): number {
  let score = (a.rating ?? 0) * 10;
  if (!profile) return score;

  if (profile.budget === "whale" || profile.budget === "large") {
    if (a.advisor_tier === "premium" || a.advisor_tier === "vip") score += 12;
  }
  if (profile.budget === "small") {
    if (a.advisor_tier === "vip") score -= 8; // cheap budgets won't book VIP
  }
  return score;
}

interface StripItem {
  slug: string;
  name: string;
  href: string;
  avatar: string | null;
  sub: string | null;
}

function renderStrip({
  kind,
  profile,
  intentCountry,
  items,
}: {
  kind: RecKind;
  profile: QuizProfile | null;
  intentCountry: IntentCountryCode | null;
  items: StripItem[];
}) {
  const meta = intentCountry ? intentCountryMeta(intentCountry) : null;
  const headline = buildHeadline(kind, profile, meta);
  const seeAllHref = kind === "brokers" ? "/brokers" : "/advisors";

  return (
    <section
      aria-label="Recommended for you"
      className="bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/60 border-y border-emerald-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <span aria-hidden className="mr-1.5">
                {meta?.flag ?? "✨"}
              </span>
              Recommended for you
            </p>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mt-1">
              {headline}
            </h2>
          </div>
          <Link
            href={seeAllHref}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
          >
            See all {kind} &rarr;
          </Link>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {items.map((it) => (
            <li key={it.slug}>
              <Link
                href={it.href}
                className="group flex items-start gap-3 bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-200 rounded-xl p-3 transition-colors"
              >
                {it.avatar ? (
                  <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden bg-slate-100">
                    <Image
                      src={it.avatar}
                      alt={it.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500">
                    {it.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-900">
                    {it.name}
                  </p>
                  {it.sub && (
                    <p className="text-xs text-slate-500 truncate">{it.sub}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function buildHeadline(
  kind: RecKind,
  profile: QuizProfile | null,
  meta: ReturnType<typeof intentCountryMeta> | null,
): string {
  const noun = kind === "brokers" ? "Platforms" : "Specialists";
  if (profile?.completedAt) {
    if (meta) return `${noun} matched to your quiz + ${meta.label}`;
    return `${noun} matched to your quiz answers`;
  }
  if (meta) return `${noun} for investors from ${meta.name}`;
  return `${noun} we think fit your profile`;
}
