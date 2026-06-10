"use client";

import { useEffect, useState, useCallback } from "react";
import Icon from "@/components/Icon";
import type { Advisor } from "./types";
import { ClientReferralsSection } from "./ReferralPanel";

const CREDIT_PER_REFERRAL_CENTS = 5000; // $50

interface AdvisorReferralStats {
  total_referred: number;
  active_referrals: number;
  credits_earned_cents: number;
}

interface AdvisorReferralData {
  referral_code: string;
  referral_url: string;
  stats: AdvisorReferralStats;
}

type Props = {
  advisor: Advisor | null;
};

export default function EarnTab({ advisor }: Props) {
  const [data, setData] = useState<AdvisorReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/advisor-auth/referrals");
      if (!res.ok) throw new Error("Failed to load referral data");
      const json = (await res.json()) as AdvisorReferralData;
      setData(json);
      setError(null);
    } catch {
      setError("Failed to load referral data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopy = async () => {
    if (!data?.referral_url) return;
    try {
      await navigator.clipboard.writeText(data.referral_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — silently fail
    }
  };

  const handleLinkedInShare = () => {
    if (!data?.referral_url) return;
    const text = encodeURIComponent(
      `I've joined Invest.com.au — a platform connecting Australians with qualified financial advisors. If you're a financial advisor looking to grow your practice, sign up with my referral link and we'll both benefit.\n\n${data.referral_url}`
    );
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.referral_url)}&summary=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading earnings…">
        <div className="h-28 bg-slate-100 rounded-xl" />
        <div className="h-24 bg-slate-100 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 bg-slate-100 rounded-xl" />
          <div className="h-24 bg-slate-100 rounded-xl" />
          <div className="h-24 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const stats = data?.stats ?? {
    total_referred: 0,
    active_referrals: 0,
    credits_earned_cents: 0,
  };

  const creditsEarnedDollars = (stats.credits_earned_cents / 100).toFixed(0);
  const creditPerReferralDollars = (CREDIT_PER_REFERRAL_CENTS / 100).toFixed(0);

  return (
    <div className="space-y-5">
      {/* ── Hero card ── */}
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
            <Icon name="gift" size={20} className="text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Refer advisors, earn credits
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Share your unique link with other financial advisors. When they
              activate their Invest.com.au account, you earn{" "}
              <span className="font-semibold text-violet-700">
                ${creditPerReferralDollars} credit
              </span>{" "}
              — no limit on referrals.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Icon name="check-circle" size={14} className="text-violet-500" />
            Credits apply to lead purchases
          </span>
          <span className="flex items-center gap-1">
            <Icon name="check-circle" size={14} className="text-violet-500" />
            No limit on referrals
          </span>
          <span className="flex items-center gap-1">
            <Icon name="check-circle" size={14} className="text-violet-500" />
            Credits added automatically on activation
          </span>
        </div>
      </div>

      {/* ── Your referral link ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-bold text-slate-900 mb-3">
          Your referral link
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={data?.referral_url ?? ""}
            className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono select-all min-w-0"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Icon
              name={copied ? "check-circle" : "copy"}
              size={16}
              className="text-white"
            />
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
        {data?.referral_code && (
          <p className="text-xs text-slate-400 mt-2">
            Your code:{" "}
            <span className="font-mono font-semibold text-slate-600">
              {data.referral_code}
            </span>
          </p>
        )}
      </div>

      {/* ── Share buttons ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-bold text-slate-900 mb-3">
          Share with advisors
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Icon name="copy" size={16} className="text-slate-500" />
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={handleLinkedInShare}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0077B5] text-white text-sm font-semibold rounded-lg hover:bg-[#006399] transition-colors"
          >
            <Icon name="share-2" size={16} className="text-white" />
            Share on LinkedIn
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <Icon name="users" size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {stats.total_referred}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Advisors referred</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <Icon name="check-circle" size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {stats.active_referrals}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Now active</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <Icon name="dollar-sign" size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            ${creditsEarnedDollars}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Credits earned</p>
        </div>
      </div>

      {/* ── Onboarding nudge (zero state) ── */}
      {stats.total_referred === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl" aria-hidden>🚀</span>
          <div>
            <p className="text-sm font-bold text-amber-900 mb-1">You haven&apos;t referred anyone yet</p>
            <p className="text-xs text-amber-800">
              Share your link above with advisors you know — colleagues, classmates, or LinkedIn connections. Each advisor who activates earns you ${creditPerReferralDollars} in free lead credits. There&apos;s no cap on referrals.
            </p>
          </div>
        </div>
      )}

      {/* ── How it works ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          How it works
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
              1
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Share your unique link
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Copy your referral link and send it to advisors who might
                benefit from listing on Invest.com.au.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
              2
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                They sign up and activate
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                The advisor signs up at{" "}
                <span className="font-mono text-[0.7rem]">
                  invest.com.au/advisor-signup
                </span>{" "}
                using your link and completes verification.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
              3
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                You earn ${creditPerReferralDollars} credit
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Once their account is activated by our team, ${creditPerReferralDollars}{" "}
                credit is added to your account automatically. Use it to
                purchase leads — no expiry.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-xs text-slate-500">
          Credits are awarded when a referred advisor&apos;s account is
          activated by the Invest.com.au team. Credits cannot be withdrawn as
          cash and apply only to lead purchases on the platform.
        </div>
      </div>

      {/* Client referrals (advisor→advisor) — distinct from the sign-up
          referral programme above. */}
      <ClientReferralsSection />

      {advisor?.name && (
        <p className="text-xs text-slate-400 text-center">
          Logged in as {advisor.name}
        </p>
      )}
    </div>
  );
}
