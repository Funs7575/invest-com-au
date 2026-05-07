"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import { createClient } from "@/lib/supabase/client";
import QuizComparisonTable from "./QuizComparisonTable";
import AdvisorLocationStep from "./AdvisorLocationStep";
import AdvisorMatchedScreen, { type MatchedAdvisor } from "./AdvisorMatchedScreen";

// Map the quiz "amount" answer to the AdvisorLocationStep BUDGETS option
// values so we don't re-ask information the quiz already collected.
const QUIZ_AMOUNT_TO_BUDGET: Record<string, string> = {
  small: "under_100k",
  medium: "under_100k",
  large: "100k_500k",
  whale: "500k_2m",
};

/* ─── Constants ─── */
const COMBO_MAP: Record<string, { type: string; label: string; reason: string; icon: string }[]> = {
  "mortgage-broker": [
    { type: "insurance-broker", label: "Insurance Broker", reason: "Protect your new home and income", icon: "shield" },
    { type: "tax-agent", label: "Tax Agent", reason: "Maximise mortgage interest deductions", icon: "file-text" },
  ],
  "financial-planner": [
    { type: "tax-agent", label: "Tax Agent", reason: "Optimise your tax position alongside your plan", icon: "file-text" },
    { type: "insurance-broker", label: "Insurance Broker", reason: "Ensure adequate protection as your wealth grows", icon: "shield" },
  ],
  "buyers-agent": [
    { type: "mortgage-broker", label: "Mortgage Broker", reason: "Secure the best loan for your purchase", icon: "home" },
    { type: "insurance-broker", label: "Insurance Broker", reason: "Protect your investment property", icon: "shield" },
  ],
  "tax-agent": [
    { type: "financial-planner", label: "Financial Planner", reason: "Align your tax strategy with long-term goals", icon: "briefcase" },
  ],
  "insurance-broker": [
    { type: "financial-planner", label: "Financial Planner", reason: "Review your overall financial protection", icon: "briefcase" },
  ],
  "smsf-accountant": [
    { type: "financial-planner", label: "Financial Planner", reason: "Investment strategy for your SMSF", icon: "briefcase" },
    { type: "insurance-broker", label: "Insurance Broker", reason: "Life and TPD cover through your SMSF", icon: "shield" },
  ],
};

const ADVISOR_LABELS: Record<string, string> = {
  "mortgage-broker": "Mortgage Broker",
  "buyers-agent": "Buyer's Agent",
  "financial-planner": "Financial Planner",
  "smsf-accountant": "SMSF Accountant",
  "tax-agent": "Tax Agent",
  "insurance-broker": "Insurance Broker",
  "estate-planner": "Estate Planner",
  "not-sure": "Financial Advisor",
};

const ADVISOR_HREFS: Record<string, string> = {
  "mortgage-broker": "/advisors/mortgage-brokers",
  "buyers-agent": "/advisors/buyers-agents",
  "financial-planner": "/advisors/financial-planners",
  "smsf-accountant": "/advisors/smsf-accountants",
  "tax-agent": "/advisors/tax-agents",
  "insurance-broker": "/advisors/insurance-brokers",
  "not-sure": "/find-advisor",
};

// Map quiz advisor_type slug → DB `type` field (underscore format)
const TYPE_DB_MAP: Record<string, string> = {
  "mortgage-broker": "mortgage_broker",
  "buyers-agent": "buyers_agent",
  "financial-planner": "financial_planner",
  "smsf-accountant": "smsf_accountant",
  "tax-agent": "tax_agent",
  "insurance-broker": "insurance_broker",
  "estate-planner": "estate_planner",
  "not-sure": "",
};

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

  const advisorLabel = ADVISOR_LABELS[advisorType] || "Financial Advisor";
  const advisorHref = ADVISOR_HREFS[advisorType] || "/find-advisor";
  const combos = COMBO_MAP[advisorType] || [];
  const topPlatforms = platformResults.filter((r) => r.broker).slice(0, 3);
  const canSubmitContact = name.trim().length >= 2 && phone.trim().length >= 8 && email.includes("@");

  // Fetch a preview advisor when the contact step loads — best representative
  // of this advisor type, regardless of location. We're not committing the
  // user to this advisor; we're showing them what kind of person they'll be
  // matched with so the contact form feels less blind.
  useEffect(() => {
    let cancelled = false;
    const dbType = TYPE_DB_MAP[advisorType];
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
      await fetch("/api/advisor-lead", {
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
      trackEvent("advisor_lead_submit", { advisor_type: advisorType, state: stateValue }, "/quiz");
    } catch {
      // Non-blocking — still proceed to matching
    }

    // Fetch matched advisors from Supabase
    try {
      const supabase = createClient();
      const dbType = TYPE_DB_MAP[advisorType];

      const mapAdvisor = (p: Record<string, unknown>): MatchedAdvisor => ({
        id: p.id as number,
        slug: p.slug as string,
        name: p.name as string,
        firm_name: (p.firm_name as string) ?? null,
        type: p.type as string,
        photo_url: (p.photo_url as string) ?? null,
        rating: (p.rating as number) ?? 0,
        review_count: (p.review_count as number) ?? 0,
        location_display: (p.location_display as string) ?? null,
        specialties: (p.specialties as string[]) ?? [],
        fee_description: (p.fee_description as string) ?? null,
        verified: (p.verified as boolean) ?? false,
      });

      let matched: MatchedAdvisor[] = [];

      if (isInternational) {
        // For international investors: first try advisors with international flags
        let intlQuery = supabase
          .from("professionals")
          .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, location_state, specialties, fee_description, verified, accepts_international_clients, international_tax_specialist, firb_specialist, languages")
          .eq("status", "active")
          .eq("verified", true)
          .eq("accepts_international_clients", true);
        if (dbType) intlQuery = intlQuery.eq("type", dbType);
        const { data: intlData } = await intlQuery.order("rating", { ascending: false }).order("review_count", { ascending: false }).limit(5);
        matched = (intlData || []).map(mapAdvisor);

        // Fallback: search by international specialty keywords
        if (matched.length < 3) {
          const { data: specData } = await supabase
            .from("professionals")
            .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, location_state, specialties, fee_description, verified")
            .eq("status", "active")
            .eq("verified", true)
            .contains("specialties", ["International Clients"])
            .order("rating", { ascending: false })
            .limit(5);
          const specMapped = (specData || []).map(mapAdvisor);
          const existingIds = new Set(matched.map(m => m.id));
          matched.push(...specMapped.filter(m => !existingIds.has(m.id)));
        }
      } else {
        let query = supabase
          .from("professionals")
          .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, location_state, specialties, fee_description, verified")
          .eq("status", "active")
          .eq("verified", true);
        if (dbType) query = query.eq("type", dbType);
        if (stateValue) query = query.eq("location_state", stateValue);
        const { data } = await query.order("rating", { ascending: false }).order("review_count", { ascending: false }).limit(5);
        matched = (data || []).map(mapAdvisor);

        // Fallback: try without state filter if empty
        if (matched.length === 0 && stateValue) {
          let fallbackQuery = supabase
            .from("professionals")
            .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, location_state, specialties, fee_description, verified")
            .eq("status", "active")
            .eq("verified", true);
          if (dbType) fallbackQuery = fallbackQuery.eq("type", dbType);
          const { data: fallbackData } = await fallbackQuery.order("rating", { ascending: false }).limit(5);
          matched.push(...(fallbackData || []).map(mapAdvisor));
        }
      }

      setAllMatches(matched);
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
              <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
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
                  className="px-4 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
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
                className="block mx-auto mt-4 text-xs text-slate-400 hover:text-slate-600 transition-colors"
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
                Sample match
              </span>
              <span className="text-[0.6rem] md:text-[0.65rem] text-slate-400">— typical advisor of this type</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                {previewAdvisor.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external advisor headshots from Supabase storage; next/image not configured for these hosts
                  <img src={previewAdvisor.photo_url} alt={previewAdvisor.name} className="w-full h-full object-cover" />
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
                  <span className="inline-flex items-center gap-0.5">
                    <Icon name="clock" size={10} />
                    Replies within 24h
                  </span>
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
            <p className="text-[0.6rem] md:text-[0.65rem] text-slate-400 mt-2.5 italic">
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
          <p className="text-xs text-slate-500 mb-4">
            Browse our directory of licensed {advisorLabel}s or request a no-obligation initial call.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Alex Smith"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                placeholder="04xx xxx xxx"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>
          {contactError && <p className="text-xs text-red-500 mt-2">{contactError}</p>}
          <button
            onClick={handleContactNext}
            disabled={!canSubmitContact}
            className="w-full mt-4 py-3 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            Continue — choose my location →
          </button>
          <p className="text-[0.6rem] text-slate-400 mt-2 text-center">
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
        {combos.length > 0 && (
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
              {combos.map((combo) => (
                <div key={combo.type} className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon name={combo.icon} size={18} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-slate-900">{combo.label}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{combo.reason}</p>
                  </div>
                  <Link
                    href={`/find-advisor?need=${combo.type}`}
                    onClick={() => trackEvent("advisor_combo_click", { primary: advisorType, combo_type: combo.type }, "/quiz")}
                    className="shrink-0 self-center px-3 py-1.5 text-[0.65rem] md:text-xs font-bold text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap"
                  >
                    Find one
                  </Link>
                </div>
              ))}
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
          <button onClick={onRestart} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Restart Quiz →
          </button>
        </div>
      </div>
    </div>
  );
}
