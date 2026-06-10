/**
 * Homepage personalised strip (W-HOMEPAGE-PERSONAL).
 *
 * Server component. Renders above the static marketing content for
 * signed-in and returning visitors. Anonymous / first-time visitors see
 * nothing — the existing ResumeBanner (sessionStorage-backed) and static
 * page already handle that case.
 *
 * Architecture:
 *   - Resolves auth + quiz signals in parallel (one supabase round-trip,
 *     deduplicated by React cache() in getQuizProfile / getInvestorProfile).
 *   - Delegates classification to the pure `classifyVisitor` helper in
 *     lib/homepage-personalisation.ts (testable without mocking Next.js).
 *   - Reuses SmartRecommendationsStrip for the recs row (already handles
 *     vertical-routing and country-eligibility).
 *   - Reuses buildNextActions from lib/next-action for the next-step card.
 *   - Falls back to null (renders nothing) on any error — never breaks the
 *     homepage render.
 *
 * AFSL compliance: every action that surfaces product comparisons or advisor
 * referrals wraps GENERAL_ADVICE_WARNING from lib/compliance.ts. Copy is
 * factual ("Compare platforms", "Browse advisors") — not personal advice.
 *
 * ISR note: this component calls supabase.auth.getUser() which reads the
 * request cookie — it is implicitly dynamic. The rest of app/page.tsx
 * is ISR-cached; this strip is intentionally outside that cache boundary
 * (it is rendered in its own React subtree via Suspense in the page).
 */

import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQuizProfile } from "@/lib/quiz-profile";
import { getInvestorProfile } from "@/lib/investor-profiles";
import { getIntentCountry } from "@/lib/intent-context-server";
import {
  classifyVisitor,
  buildWelcomeGreeting,
} from "@/lib/homepage-personalisation";
import { buildNextActions, type NextActionSignals } from "@/lib/next-action";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SmartRecommendationsStrip from "@/components/SmartRecommendationsStrip";

// ─── Saved-items count helper ────────────────────────────────────────────────

interface SavedCounts {
  shortlistedBrokers: number;
  savedAdvisors: number;
  savedComparisons: number;
}

async function loadSavedCounts(userId: string): Promise<SavedCounts> {
  const [serverClient, adminClient] = [await createClient(), createAdminClient()];

  const [shortlistRes, advisorRes, comparisonRes] = await Promise.allSettled([
    serverClient
      .from("user_shortlisted_brokers")
      .select("broker_slug", { count: "exact", head: true })
      .eq("user_id", userId),
    adminClient
      .from("user_bookmarks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("bookmark_type", "advisor"),
    adminClient
      .from("saved_broker_comparisons")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  return {
    shortlistedBrokers:
      shortlistRes.status === "fulfilled"
        ? ((shortlistRes.value as { count: number | null }).count ?? 0)
        : 0,
    savedAdvisors:
      advisorRes.status === "fulfilled"
        ? ((advisorRes.value as { count: number | null }).count ?? 0)
        : 0,
    savedComparisons:
      comparisonRes.status === "fulfilled"
        ? ((comparisonRes.value as { count: number | null }).count ?? 0)
        : 0,
  };
}

// ─── Inner async component ────────────────────────────────────────────────────

async function PersonalisedStripInner() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch signals in parallel. investor_profiles only fetched for authed users
    // (admin-client read; costly to call on every anonymous visit).
    const [quizProfile, intentCountry, investorProfile] = await Promise.all([
      getQuizProfile(),
      getIntentCountry(),
      user ? getInvestorProfile(user.id) : Promise.resolve(null),
    ]);

    const kind = classifyVisitor({
      isSignedIn: !!user,
      quizCompleted: !!quizProfile?.completedAt,
      hasIntentCountry: !!intentCountry,
      displayName: investorProfile?.displayName ?? null,
    });

    if (kind === "anonymous") return null;

    const greeting = buildWelcomeGreeting(
      kind,
      investorProfile?.displayName ?? null,
    );

    // Build next-action signals from merged profile
    const vertical =
      investorProfile?.primaryVertical ?? quizProfile?.vertical ?? null;
    const signals: NextActionSignals = {
      profile: investorProfile
        ? {
            primaryVertical: investorProfile.primaryVertical,
            budgetBand: investorProfile.budgetBand,
            experienceLevel: investorProfile.experienceLevel,
            isFhb: investorProfile.isFhb,
            isPreRetiree: investorProfile.isPreRetiree,
            isCrossBorder: investorProfile.isCrossBorder,
            isHnw: investorProfile.isHnw,
            isBusinessOwner: investorProfile.isBusinessOwner,
          }
        : null,
      quizVertical: quizProfile?.vertical ?? null,
      quizCompleted: !!quizProfile?.completedAt,
      topMatchSlug: quizProfile?.topMatchSlug ?? null,
      intentCountry: investorProfile?.intentCountrySnapshot ?? intentCountry,
      surface: "other",
    };

    const nextActions = buildNextActions(signals).slice(0, 3);
    const primaryAction = nextActions[0];

    // Saved-item counts (signed-in only)
    const savedCounts =
      kind === "signed-in" && user
        ? await loadSavedCounts(user.id)
        : null;

    const hasSavedActivity =
      savedCounts &&
      (savedCounts.shortlistedBrokers > 0 ||
        savedCounts.savedAdvisors > 0 ||
        savedCounts.savedComparisons > 0);

    return (
      <div
        className="bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 border-b border-slate-100"
        aria-label="Your personalised dashboard"
        data-testid="homepage-personalised-strip"
      >
        {/* ── Welcome row ─────────────────────────────────────────── */}
        <div className="container-custom pt-5 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {greeting && (
                <p className="text-base font-bold text-slate-900 sm:text-lg">
                  {greeting}
                </p>
              )}
              {vertical && (
                <p className="text-sm text-slate-500 mt-0.5">
                  {verticalLabel(vertical)}
                </p>
              )}
            </div>

            {/* ── Saved-activity pills (signed-in) ─────────────── */}
            {hasSavedActivity && savedCounts && (
              <ul className="flex flex-wrap gap-2">
                {savedCounts.shortlistedBrokers > 0 && (
                  <li>
                    <Link
                      href="/shortlist"
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      <span aria-hidden>📊</span>
                      {savedCounts.shortlistedBrokers} shortlisted broker
                      {savedCounts.shortlistedBrokers !== 1 ? "s" : ""}
                    </Link>
                  </li>
                )}
                {savedCounts.savedAdvisors > 0 && (
                  <li>
                    <Link
                      href="/account/bookmarks"
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                    >
                      <span aria-hidden>🧑‍💼</span>
                      {savedCounts.savedAdvisors} saved advisor
                      {savedCounts.savedAdvisors !== 1 ? "s" : ""}
                    </Link>
                  </li>
                )}
                {savedCounts.savedComparisons > 0 && (
                  <li>
                    <Link
                      href="/account/saved"
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <span aria-hidden>🔖</span>
                      {savedCounts.savedComparisons} saved comparison
                      {savedCounts.savedComparisons !== 1 ? "s" : ""}
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* ── Primary next-action card ─────────────────────────── */}
          {primaryAction && (
            <div className="mt-4 mb-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {primaryAction.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {primaryAction.description}
                  </p>
                </div>
                <Link
                  href={primaryAction.href}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 transition-colors"
                >
                  {primaryAction.cta}
                  <span aria-hidden>→</span>
                </Link>
              </div>
              {primaryAction.showAdviceWarning && (
                <p className="mt-2 text-[0.65rem] text-slate-500 leading-relaxed">
                  {GENERAL_ADVICE_WARNING}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── SmartRecommendationsStrip — reuses the existing engine ── */}
        <SmartRecommendationsStrip />
      </div>
    );
  } catch {
    // Fail-soft: never break the homepage
    return null;
  }
}

// ─── Public component with Suspense boundary ──────────────────────────────────

/**
 * Homepage personalised strip — wraps in Suspense so the async auth
 * read doesn't block the (ISR-cached) static page below it.
 */
export default function HomepagePersonalisedStrip() {
  return (
    <Suspense fallback={null}>
      <PersonalisedStripInner />
    </Suspense>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function verticalLabel(vertical: string): string {
  const LABELS: Record<string, string> = {
    trade: "Your focus: trading platforms",
    automate: "Your focus: automated investing",
    fees: "Your focus: minimising brokerage fees",
    tools: "Your focus: research & tools",
    safety: "Your focus: capital protection",
    crypto: "Your focus: crypto platforms",
    broker_diy: "Your focus: DIY investing",
    advisor_match: "Your focus: finding an advisor",
    complex: "Your focus: complex wealth",
    wealth: "Your focus: wealth management",
    super: "Your focus: superannuation",
    smsf: "Your focus: self-managed super",
    property: "Your focus: property investing",
    first_home: "Your focus: buying your first home",
    international: "Your focus: international investing",
  };
  return LABELS[vertical] ?? "Personalised for you";
}

