"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import { createClient } from "@/lib/supabase/client";
import QuizComparisonTable from "./QuizComparisonTable";
import AdvisorLocationStep from "./AdvisorLocationStep";
import AdvisorMatchedScreen, { type MatchedAdvisor } from "./AdvisorMatchedScreen";
import type { ScoredQuizAdvisor } from "@/lib/quiz-advisor-scoring";
import { allocateAdvisors } from "@/lib/quiz-flow";
import type { AdvisorNeed } from "@/lib/quiz-primary-advisor";
import { QUIZ_ADVISOR_TYPES, dbTypeForNeed, labelForNeed, hrefForNeed } from "@/lib/quiz-advisor-types";

// Map the quiz "amount" answer to the AdvisorLocationStep BUDGETS option
// values so we don't re-ask information the quiz already collected.
const QUIZ_AMOUNT_TO_BUDGET: Record<string, string> = {
  small: "under_100k",
  medium: "under_100k",
  large: "100k_500k",
  whale: "500k_2m",
};

// Advisor-type metadata (label / directory href / DB type / team copy) lives in
// the shared registry lib/quiz-advisor-types.ts — single source of truth across
// this screen and /api/advisor-match.

// Map a scored API match → the MatchedAdvisor shape the cards render, carrying
// the match score + confidence band through for display.
function toMatchedAdvisor(a: ScoredQuizAdvisor): MatchedAdvisor {
  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    firm_name: a.firm_name ?? null,
    type: a.type,
    photo_url: a.photo_url ?? null,
    rating: a.rating ?? 0,
    review_count: a.review_count ?? 0,
    location_display: a.location_display ?? null,
    location_state: a.location_state ?? null,
    specialties: a.specialties ?? [],
    fee_description: a.fee_description ?? null,
    verified: a.verified ?? false,
    accepts_international_clients: a.accepts_international_clients ?? null,
    international_tax_specialist: a.international_tax_specialist ?? null,
    firb_specialist: a.firb_specialist ?? null,
    languages: a.languages ?? null,
    available_in_countries: a.available_in_countries ?? null,
    years_experience: a.years_experience ?? null,
    avg_response_minutes: a.avg_response_minutes ?? null,
    response_time_hours: a.response_time_hours ?? null,
    initial_consultation_free: a.initial_consultation_free ?? null,
    booking_link: a.booking_link ?? null,
    matchScore: a.matchScore,
    confidence: a.confidence,
  };
}

type FlowStep = "contact" | "location" | "matching";

interface PlatformResult {
  slug: string;
  total: number;
  broker?: Broker;
}

interface Props {
  advisorType: string;
  quizAnswers: Record<string, string>;
  platformResults: PlatformResult[];
  onRestart: () => void;
  isInternational?: boolean;
  investorCountry?: string;
  visaStatus?: string;
  investorGoalIntl?: string;
}

export default function AdvisorResultsScreen({ advisorType, quizAnswers, platformResults, onRestart, isInternational = false, investorCountry, visaStatus, investorGoalIntl }: Props) {
  // Step state
  const [step, setStep] = useState<FlowStep>("contact");

  // Contact fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactError, setContactError] = useState("");

  // Location fields (managed by AdvisorLocationStep) — budget is pre-filled
  // from the quiz `amount` answer if available, so the user doesn't have to
  // re-tell us how much they're investing.
  const [stateValue, setStateValue] = useState("");
  const [postcodeValue, setPostcodeValue] = useState("");
  const [suburbValue, setSuburbValue] = useState("");
  const [budgetValue, setBudgetValue] = useState(() => {
    const quizAmount = quizAnswers.amount;
    if (quizAmount && QUIZ_AMOUNT_TO_BUDGET[quizAmount]) return QUIZ_AMOUNT_TO_BUDGET[quizAmount];
    return "";
  });
  const [locationError, setLocationError] = useState("");

  // Matching state
  const [allMatches, setAllMatches] = useState<MatchedAdvisor[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [_confirmedAdvisorId, setConfirmedAdvisorId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Preview advisor — fetched on mount so the contact step shows a real
  // advisor card above the form, instead of asking for name/phone/email
  // before the user knows who they're being matched with. Best advisor of
  // the right type, no location filter (location is collected next step).
  const [previewAdvisor, setPreviewAdvisor] = useState<MatchedAdvisor | null>(null);

  const advisorLabel = labelForNeed(advisorType);
  const advisorHref = hrefForNeed(advisorType);

  // The single lead (`advisorType`) is pickPrimary's allocated primary (see
  // resolveLeadAdvisorType in page.tsx). The "team" is the rest of the need-set,
  // rendered as directory links — never a second lead postback. Fold the
  // elected primary back in on the rare post-job fallback (advisorType then
  // comes from inferAdvisorType, not the allocation) so nothing is hidden.
  const { primary, secondaries } = allocateAdvisors(quizAnswers);
  const team: AdvisorNeed[] = [
    ...(primary !== "post-job" && primary !== advisorType ? [primary] : []),
    ...secondaries,
  ].filter((n, i, arr) => n !== advisorType && n !== "not-sure" && arr.indexOf(n) === i);

  const topPlatforms = platformResults.filter((r) => r.broker).slice(0, 3);
  const canSubmitContact = name.trim().length >= 2 && phone.trim().length >= 8 && email.includes("@");

  // Fetch a preview advisor when the contact step loads — best representative
  // of this advisor type, regardless of location. We're not committing the
  // user to this advisor; we're showing them what kind of person they'll be
  // matched with so the contact form feels less blind.
  useEffect(() => {
    let cancelled = false;
    const dbType = dbTypeForNeed(advisorType);
    if (!dbType) return; // "not-sure" or unknown — skip preview
    (async () => {
      try {
        const supabase = createClient();
        let q = supabase
          .from("professionals")
          .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, specialties, fee_description, verified")
          .eq("status", "active")
          .eq("verified", true)
          .eq("type", dbType);
        if (isInternational) {
          q = q.eq("accepts_international_clients", true);
        }
        const { data } = await q.order("rating", { ascending: false }).order("review_count", { ascending: false }).limit(1);
        if (cancelled) return;
        const row = data?.[0] as Record<string, unknown> | undefined;
        if (!row) return;
        setPreviewAdvisor({
          id: row.id as number,
          slug: row.slug as string,
          name: row.name as string,
          firm_name: (row.firm_name as string) ?? null,
          type: row.type as string,
          photo_url: (row.photo_url as string) ?? null,
          rating: (row.rating as number) ?? 0,
          review_count: (row.review_count as number) ?? 0,
          location_display: (row.location_display as string) ?? null,
          specialties: (row.specialties as string[]) ?? [],
          fee_description: (row.fee_description as string) ?? null,
          verified: (row.verified as boolean) ?? false,
        });
      } catch {
        /* preview is best-effort — silent failure is acceptable */
      }
    })();
    return () => { cancelled = true; };
  }, [advisorType, isInternational]);

  /* ─── Step 1 → Step 2 ─── */
  const handleContactNext = () => {
    if (!canSubmitContact) {
      setContactError("Please fill in all required fields.");
      return;
    }
    setContactError("");
    trackEvent("advisor_contact_step_complete", { advisor_type: advisorType, is_international: isInternational }, "/quiz");
    // International users skip the location step — they don't have an AU state yet
    if (isInternational) {
      setStep("location"); // location step handles international mode inline
    } else {
      setStep("location");
    }
  };

  /* ─── Step 2 → Step 3 ─── */
  const handleLocationNext = async () => {
    if (!isInternational && !stateValue) {
      setLocationError("Please select your state or enter your postcode.");
      return;
    }
    setLocationError("");
    setLoadingMatches(true);
    setSubmitError(null);

    try {
      // Submit lead with full data
      const leadRes = await fetch("/api/advisor-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          advisor_type: advisorType,
          quiz_answers: quizAnswers,
          state: stateValue || (isInternational ? "intl" : null),
          postcode: postcodeValue || null,
          suburb: suburbValue || null,
          budget: budgetValue || null,
          consent: true,
          is_international: isInternational,
          investor_country: investorCountry || null,
          visa_status: visaStatus || null,
          investor_goal_intl: investorGoalIntl || null,
          source_page: "/quiz",
        }),
      });
      if (leadRes.ok) {
        trackEvent("advisor_lead_submit", { advisor_type: advisorType, state: stateValue }, "/quiz");
      } else {
        // Don't block the match preview, but make the dropped enquiry visible
        // — a 429/500 here was previously swallowed silently. The confirm step
        // re-submits and surfaces errors to the user.
        trackEvent("advisor_lead_error", { advisor_type: advisorType, status: leadRes.status }, "/quiz");
      }
    } catch {
      // Network failure — non-blocking, but record it (was silent).
      trackEvent("advisor_lead_error", { advisor_type: advisorType, status: 0 }, "/quiz");
    }

    // Fetch scored, eligibility-filtered matches from the server. The ranking
    // and the advisor column set stay off the client (see /api/advisor-match);
    // this also applies the country-eligibility gate the old client query
    // skipped, and ranks by fit instead of raw rating.
    try {
      const res = await fetch("/api/advisor-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisorType,
          goal: quizAnswers.goal,
          amount: quizAnswers.amount,
          budget: budgetValue || undefined,
          state: stateValue || undefined,
          isInternational,
          investorCountry,
          visaStatus,
          investorGoalIntl,
          // Readiness stage — "ready"/"under-contract" lets the scorer favour
          // fast responders with an open book for users who want to act now.
          stage: quizAnswers.stage || undefined,
          limit: 5,
        }),
      });
      if (!res.ok) throw new Error(`advisor-match ${res.status}`);
      const data = (await res.json()) as { advisors: ScoredQuizAdvisor[] };
      setAllMatches((data.advisors ?? []).map(toMatchedAdvisor));
      setMatchIndex(0);
    } catch {
      setAllMatches([]);
    }

    setLoadingMatches(false);
    setStep("matching");
  };

  /* ─── Rematch ─── */
  const handleRematch = () => {
    if (matchIndex + 1 >= allMatches.length) return;
    setRematching(true);
    setTimeout(() => {
      setMatchIndex((i) => i + 1);
      setRematching(false);
    }, 600);
    trackEvent("advisor_rematch", { advisor_type: advisorType }, "/quiz");
  };

  /* ─── Confirm ─── */
  const handleConfirm = async (advisor: MatchedAdvisor) => {
    setConfirming(true);
    setSubmitError(null);
    try {
      await fetch("/api/advisor-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          advisor_type: advisorType,
          quiz_answers: quizAnswers,
          matched_advisor_slug: advisor.slug,
          confirmed: true,
          consent: true,
          source_page: "/quiz",
        }),
      });
      setConfirmedAdvisorId(advisor.id);
      trackEvent("advisor_confirmed", { advisor_slug: advisor.slug, advisor_type: advisorType }, "/quiz");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
    setConfirming(false);
  };

  /* ─── STEP: matching ─── */
  if (step === "matching") {
    const currentMatch = allMatches[matchIndex] ?? null;
    const noMoreMatches = matchIndex + 1 >= allMatches.length;

    return (
      <div className="pt-5 pb-8 md:py-12">
        <div className="container-custom max-w-2xl mx-auto">
          {loadingMatches ? (
            <div className="text-center py-16">
              <div aria-hidden="true" className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-500 font-medium">Filtering professionals…</p>
            </div>
          ) : allMatches.length === 0 ? (
            // No matches in our directory for this type/state — give the user
            // a clear next step instead of an empty card. /quotes/post is the
            // universal fallback ("describe your situation, get quotes").
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 md:p-6 text-center">
              <Icon name="search" size={32} className="text-amber-500 mx-auto mb-3" />
              <h2 className="text-base md:text-lg font-extrabold text-slate-900 mb-1.5">No verified {advisorLabel}s in our directory yet</h2>
              <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
                Our directory is still growing. The fastest way to get help right now is to post your situation — verified pros reply with quotes.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href={`/quotes/post?context=quiz&type=${advisorType}`}
                  onClick={() => trackEvent("advisor_no_match_post_job", { advisor_type: advisorType }, "/quiz")}
                  className="px-4 py-2.5 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Post your situation →
                </Link>
                <Link
                  href={advisorHref}
                  onClick={() => trackEvent("advisor_no_match_browse", { advisor_type: advisorType }, "/quiz")}
                  className="px-4 py-2.5 border border-amber-300 text-amber-700 text-sm font-semibold rounded-lg hover:bg-amber-100 transition-colors"
                >
                  Browse {advisorLabel}s
                </Link>
              </div>
              <button
                onClick={onRestart}
                className="block mx-auto mt-4 text-xs text-slate-500 hover:text-slate-600 transition-colors"
              >
                Restart quiz →
              </button>
            </div>
          ) : (
            <>
              <AdvisorMatchedScreen
                userEmail={email}
                userFirstName={name.split(" ")[0]}
                currentMatch={currentMatch}
                allMatches={allMatches}
                matchIndex={matchIndex}
                onRematch={handleRematch}
                rematching={rematching}
                noMoreMatches={noMoreMatches}
                onRestart={onRestart}
                submitError={submitError}
                onConfirm={handleConfirm}
                confirming={confirming}
                matchContext={{
                  advisorType,
                  goal: quizAnswers.goal,
                  amount: quizAnswers.amount,
                  budget: budgetValue || undefined,
                  userState: stateValue || undefined,
                  isInternational,
                  investorCountry,
                  visaStatus,
                  investorGoalIntl,
                }}
              />

              {/* Platform cross-sell below matched screen */}
              {topPlatforms.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="bar-chart" size={16} className="text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-800">While you wait — compare top platforms</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    You can also start investing yourself alongside professional advice.
                  </p>
                  <QuizComparisonTable allResults={topPlatforms} />
                  <Link href="/compare" className="block text-center mt-1 text-xs font-semibold text-amber-600 hover:text-amber-700">
                    Compare all platforms →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  /* ─── STEP: location ─── */
  if (step === "location") {
    return (
      <div className="pt-5 pb-8 md:py-12">
        <div className="container-custom max-w-lg mx-auto">
          <AdvisorLocationStep
            stateValue={stateValue}
            postcodeValue={postcodeValue}
            suburbValue={suburbValue}
            budgetValue={budgetValue}
            onStateChange={setStateValue}
            onPostcodeChange={(postcode, state, suburb) => {
              setPostcodeValue(postcode);
              if (state) setStateValue(state);
              setSuburbValue(suburb);
            }}
            onBudgetChange={setBudgetValue}
            onNext={handleLocationNext}
            onBack={() => setStep("contact")}
            error={locationError}
          />
        </div>
      </div>
    );
  }

  const COUNTRY_LABELS: Record<string, string> = {
    singapore: "Singapore", hong_kong: "Hong Kong", china: "China", india: "India",
    uae: "UAE / Middle East", uk: "United Kingdom", usa: "United States",
    malaysia: "Malaysia", new_zealand: "New Zealand", other: "your country",
  };
  const countryLabel = investorCountry ? (COUNTRY_LABELS[investorCountry] || "your country") : "overseas";

  /* ─── STEP: contact (default) ─── */
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-2xl mx-auto">
        {/* International context banner */}
        {isInternational && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5">🌏</span>
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Filtering international-specialist professionals
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                We&apos;ll connect you with Australian advisors who specifically work with clients from {countryLabel} — including FIRB-accredited buyers agents, cross-border tax accountants, and non-resident mortgage brokers.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-5 md:mb-6 reveal-screen-in">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="users" size={28} className="text-amber-600" />
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold mb-1">
            You need a verified {advisorLabel}
          </h1>
          <p className="text-sm text-slate-500">
            {isInternational
              ? `Browse Australian ${advisorLabel}s who work with international clients.`
              : "Based on your answers, you may want to explore professional directories."}
          </p>
        </div>

        {/* Preview advisor card — best representative of this advisor type.
            Shows the user what they're being matched with BEFORE they hand
            over name/phone/email, so the form doesn't feel blind. */}
        {previewAdvisor && (
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 md:p-4 mb-4 md:mb-5 reveal-screen-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[0.6rem] md:text-[0.65rem] font-bold uppercase tracking-wider rounded-full">
                <Icon name="check" size={10} className="text-emerald-600" />
                Example profile
              </span>
              <span className="text-[0.6rem] md:text-[0.65rem] text-slate-500">— the kind of professional we match you with; your match comes next</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                {previewAdvisor.photo_url ? (
                  <Image src={previewAdvisor.photo_url} alt={previewAdvisor.name} width={56} height={56} className="object-cover" />
                ) : (
                  <span className="text-base md:text-lg font-bold text-slate-500">
                    {previewAdvisor.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm md:text-base font-bold text-slate-900">{previewAdvisor.name}</p>
                  {previewAdvisor.verified && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-px bg-blue-50 text-blue-700 text-[0.55rem] md:text-[0.6rem] font-semibold rounded-full">
                      <Icon name="shield" size={9} />
                      Verified
                    </span>
                  )}
                </div>
                {previewAdvisor.firm_name && (
                  <p className="text-[0.69rem] md:text-xs text-slate-500 truncate">{previewAdvisor.firm_name}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-[0.65rem] md:text-xs text-slate-500">
                  {previewAdvisor.rating > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Icon name="star" size={10} className="text-amber-500" />
                      <strong className="text-slate-700">{previewAdvisor.rating.toFixed(1)}</strong>
                      {previewAdvisor.review_count > 0 && <span>({previewAdvisor.review_count})</span>}
                    </span>
                  )}
                  {/* No response-time chip here: the API deliberately keeps
                      response metrics server-side, so any figure would be a
                      hardcoded claim. Verified signals only. */}
                  {previewAdvisor.location_display && (
                    <span className="inline-flex items-center gap-0.5">
                      <Icon name="map-pin" size={10} />
                      {previewAdvisor.location_display}
                    </span>
                  )}
                </div>
                {previewAdvisor.specialties && previewAdvisor.specialties.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {previewAdvisor.specialties.slice(0, 3).map((s, i) => (
                      <span key={i} className="text-[0.6rem] md:text-[0.65rem] px-1.5 py-px bg-slate-100 text-slate-600 rounded-full">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-[0.6rem] md:text-[0.65rem] text-slate-500 mt-2.5 italic">
              We&rsquo;ll match you with someone like {previewAdvisor.name.split(" ")[0]} based on your location and budget.
            </p>
          </div>
        )}

        {/* Lead capture form */}
        <div className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200/60 rounded-xl p-4 md:p-6 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Icon name="phone" size={14} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Request a free consultation call</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Browse our directory of licensed {advisorLabel}s or request a no-obligation initial call.
          </p>
          {/* Trust reassurance before we ask for contact details. Truthful,
              platform-level signals only (no fabricated counts): the match is
              free to the investor, carries no obligation, and goes to a single
              advisor — the pickPrimary one-lead design, not a panel/call-centre
              resale. */}
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5 mb-4" aria-label="What to expect">
            {["Free to use", "No obligation", "One advisor, never a call centre"].map((t) => (
              <li key={t} className="flex items-center gap-1 text-[0.7rem] md:text-xs font-medium text-slate-600">
                <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
          <div className="space-y-3">
            <div>
              <label htmlFor="ars-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Full name <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <input
                id="ars-name"
                type="text"
                placeholder="Alex Smith"
                autoComplete="name"
                required
                aria-required="true"
                aria-invalid={!!contactError}
                aria-describedby={contactError ? "ars-contact-error" : undefined}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label htmlFor="ars-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Phone number <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <input
                id="ars-phone"
                type="tel"
                placeholder="04xx xxx xxx"
                autoComplete="tel"
                required
                aria-required="true"
                aria-invalid={!!contactError}
                aria-describedby={contactError ? "ars-contact-error" : undefined}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label htmlFor="ars-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email address <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <input
                id="ars-email"
                type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                placeholder="you@email.com"
                autoComplete="email"
                required
                aria-required="true"
                aria-invalid={!!contactError}
                aria-describedby={contactError ? "ars-contact-error" : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>
          {contactError && <p id="ars-contact-error" role="alert" className="text-xs text-red-500 mt-2">{contactError}</p>}
          <button
            onClick={handleContactNext}
            disabled={!canSubmitContact}
            className="w-full mt-4 py-3 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue — choose my location →
          </button>
          <p className="text-[0.6rem] text-slate-500 mt-2 text-center">
            By continuing, you consent to being contacted by a verified {advisorLabel}. No obligation. No spam.
          </p>

          {/* Browse link */}
          <div className="mt-3 pt-3 border-t border-amber-100 text-center">
            <Link
              href={advisorHref}
              onClick={() => trackEvent("advisor_browse_click", { type: advisorType }, "/quiz")}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800"
            >
              Browse verified {advisorLabel}s instead →
            </Link>
          </div>
        </div>

        {/* Recommended Team */}
        {team.length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200/60 rounded-xl p-4 md:p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Icon name="users" size={14} className="text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Related Professional Directories</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              These professionals complement your primary advisor:
            </p>
            <div className="space-y-2">
              {team.map((need) => {
                const meta = QUIZ_ADVISOR_TYPES[need];
                return (
                  <div key={need} className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Icon name={meta.teamIcon} size={18} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-slate-900">{meta.label}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{meta.teamReason}</p>
                    </div>
                    <Link
                      href={meta.href}
                      onClick={() => trackEvent("advisor_combo_click", { primary: advisorType, allocated_primary: primary, combo_type: need }, "/quiz")}
                      className="shrink-0 self-center px-3 py-1.5 text-[0.65rem] md:text-xs font-bold text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap"
                    >
                      Find one
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Platform cross-sell */}
        {topPlatforms.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="bar-chart" size={16} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Also — compare top platforms</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              You can start investing yourself alongside professional advice.
            </p>
            <QuizComparisonTable allResults={topPlatforms} />
            <Link href="/compare" className="block text-center mt-1 text-xs font-semibold text-amber-600 hover:text-amber-700">
              Compare all platforms →
            </Link>
          </div>
        )}

        {/* Restart */}
        <div className="text-center mt-4">
          <button onClick={onRestart} className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
            Restart Quiz →
          </button>
        </div>
      </div>
    </div>
  );
}
