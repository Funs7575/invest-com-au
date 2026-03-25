"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import { createClient } from "@/lib/supabase/client";
import QuizComparisonTable from "./QuizComparisonTable";
import AdvisorLocationStep from "./AdvisorLocationStep";
import AdvisorMatchedScreen, { type MatchedAdvisor } from "./AdvisorMatchedScreen";

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
}

export default function AdvisorResultsScreen({ advisorType, quizAnswers, platformResults, onRestart }: Props) {
  // Step state
  const [step, setStep] = useState<FlowStep>("contact");

  // Contact fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactError, setContactError] = useState("");

  // Location fields (managed by AdvisorLocationStep)
  const [stateValue, setStateValue] = useState("");
  const [postcodeValue, setPostcodeValue] = useState("");
  const [suburbValue, setSuburbValue] = useState("");
  const [budgetValue, setBudgetValue] = useState("");
  const [locationError, setLocationError] = useState("");

  // Matching state
  const [allMatches, setAllMatches] = useState<MatchedAdvisor[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmedAdvisorId, setConfirmedAdvisorId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const advisorLabel = ADVISOR_LABELS[advisorType] || "Financial Advisor";
  const advisorHref = ADVISOR_HREFS[advisorType] || "/find-advisor";
  const combos = COMBO_MAP[advisorType] || [];
  const topPlatforms = platformResults.filter((r) => r.broker).slice(0, 3);
  const canSubmitContact = name.trim().length >= 2 && phone.trim().length >= 8 && email.includes("@");

  /* ─── Step 1 → Step 2 ─── */
  const handleContactNext = () => {
    if (!canSubmitContact) {
      setContactError("Please fill in all required fields.");
      return;
    }
    setContactError("");
    trackEvent("advisor_contact_step_complete", { advisor_type: advisorType }, "/quiz");
    setStep("location");
  };

  /* ─── Step 2 → Step 3 ─── */
  const handleLocationNext = async () => {
    if (!stateValue) {
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
          state: stateValue,
          postcode: postcodeValue || null,
          suburb: suburbValue || null,
          budget: budgetValue || null,
          consent: true,
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
      let query = supabase
        .from("professionals")
        .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, location_state, specialties, fee_description, verified")
        .eq("status", "active")
        .eq("verified", true);

      if (dbType) query = query.eq("type", dbType);
      if (stateValue) query = query.eq("location_state", stateValue);

      const { data } = await query.order("rating", { ascending: false }).order("review_count", { ascending: false }).limit(5);

      const matched: MatchedAdvisor[] = (data || []).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        firm_name: p.firm_name ?? null,
        type: p.type,
        photo_url: p.photo_url ?? null,
        rating: p.rating ?? 0,
        review_count: p.review_count ?? 0,
        location_display: p.location_display ?? null,
        specialties: p.specialties ?? [],
        fee_description: p.fee_description ?? null,
        verified: p.verified ?? false,
      }));

      // Fallback: try without state filter if empty
      if (matched.length === 0 && stateValue) {
        let fallbackQuery = supabase
          .from("professionals")
          .select("id, slug, name, firm_name, type, photo_url, rating, review_count, location_display, location_state, specialties, fee_description, verified")
          .eq("status", "active")
          .eq("verified", true);
        if (dbType) fallbackQuery = fallbackQuery.eq("type", dbType);
        const { data: fallbackData } = await fallbackQuery.order("rating", { ascending: false }).limit(5);
        matched.push(...(fallbackData || []).map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          firm_name: p.firm_name ?? null,
          type: p.type,
          photo_url: p.photo_url ?? null,
          rating: p.rating ?? 0,
          review_count: p.review_count ?? 0,
          location_display: p.location_display ?? null,
          specialties: p.specialties ?? [],
          fee_description: p.fee_description ?? null,
          verified: p.verified ?? false,
        })));
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
              <p className="text-sm text-slate-500 font-medium">Finding your best match…</p>
            </div>
          ) : (
            <>
              <AdvisorMatchedScreen
                userEmail={email}
                userFirstName={name.split(" ")[0]}
                currentMatch={currentMatch}
                allMatches={allMatches}
                onRematch={handleRematch}
                rematching={rematching}
                noMoreMatches={noMoreMatches}
                onRestart={onRestart}
                submitError={submitError}
                onConfirm={handleConfirm}
                confirming={confirming}
                confirmedAdvisorId={confirmedAdvisorId}
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

  /* ─── STEP: contact (default) ─── */
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-5 md:mb-6 reveal-screen-in">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="users" size={28} className="text-amber-600" />
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold mb-1">
            You need a verified {advisorLabel}
          </h1>
          <p className="text-sm text-slate-500">
            Based on your answers, professional advice is the right move.
          </p>
        </div>

        {/* Lead capture form */}
        <div className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200/60 rounded-xl p-4 md:p-6 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Icon name="phone" size={14} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Get matched with a free call</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            We&apos;ll match you with a verified {advisorLabel} and arrange a no-obligation initial call.
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
              <h3 className="text-sm font-bold text-slate-800">Your Recommended Team</h3>
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
