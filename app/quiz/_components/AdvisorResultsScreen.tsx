"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import QuizComparisonTable from "./QuizComparisonTable";

interface AdvisorCombo {
  type: string;
  label: string;
  reason: string;
  icon: string;
}

const COMBO_MAP: Record<string, AdvisorCombo[]> = {
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
  "estate-planner": [
    { type: "financial-planner", label: "Financial Planner", reason: "Align your estate plan with your wealth strategy", icon: "briefcase" },
    { type: "insurance-broker", label: "Insurance Broker", reason: "Life insurance to protect your beneficiaries", icon: "shield" },
  ],
  "property-advisor": [
    { type: "mortgage-broker", label: "Mortgage Broker", reason: "Finance your investment property", icon: "home" },
    { type: "tax-agent", label: "Tax Agent", reason: "Negative gearing and capital gains planning", icon: "file-text" },
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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const advisorLabel = ADVISOR_LABELS[advisorType] || "Financial Advisor";
  const advisorHref = ADVISOR_HREFS[advisorType] || "/find-advisor";
  const combos = COMBO_MAP[advisorType] || [];
  const topPlatforms = platformResults.filter((r) => r.broker).slice(0, 3);

  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 8 && email.includes("@");

  const handleSubmit = async () => {
    if (!canSubmit || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/advisor-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          advisor_type: advisorType,
          quiz_answers: quizAnswers,
          consent: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg((data as { error?: string }).error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      trackEvent("advisor_lead_submit", { advisor_type: advisorType }, "/quiz");
      setStatus("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

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

        {/* Lead capture form or success confirmation */}
        {status !== "success" ? (
          <div className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200/60 rounded-xl p-4 md:p-6 mb-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Icon name="phone" size={14} className="text-amber-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Request a free call</h2>
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
            {errorMsg && <p className="text-xs text-red-500 mt-2">{errorMsg}</p>}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || status === "loading"}
              className="w-full mt-4 py-3 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {status === "loading" ? "Sending..." : "Request Free Call →"}
            </button>
            <p className="text-[0.6rem] text-slate-400 mt-2 text-center">
              By submitting, you consent to being contacted by a verified {advisorLabel}. No obligation. No spam.
            </p>

            {/* Browse link if they don't want to call */}
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
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-6 mb-5 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon name="check" size={24} className="text-emerald-600" />
            </div>
            <h2 className="text-base font-bold text-slate-800 mb-1">Request received!</h2>
            <p className="text-sm text-slate-500 mb-3">
              A verified {advisorLabel} will contact you within 1 business day to arrange a free initial call.
            </p>
            <Link
              href={advisorHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              Browse {advisorLabel}s while you wait →
            </Link>
          </div>
        )}

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
                <div
                  key={combo.type}
                  className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-3"
                >
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

        {/* Platform cross-sell — full comparison table */}
        {topPlatforms.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="bar-chart" size={16} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">
                While you wait — compare top platforms
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              You can also start investing yourself alongside professional advice.
            </p>
            <QuizComparisonTable allResults={topPlatforms} />
            <Link
              href="/compare"
              className="block text-center mt-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              Compare all platforms →
            </Link>
          </div>
        )}

        {/* Restart */}
        <div className="text-center mt-4">
          <button
            onClick={onRestart}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Restart Quiz →
          </button>
        </div>
      </div>
    </div>
  );
}
