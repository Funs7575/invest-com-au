"use client";

import { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/tracking";

export type LeadSegment = "fee-audit" | "smsf-checklist" | "us-shares-guide" | "switching-checklist" | "beginner-guide";

interface SegmentConfig {
  badge: string;
  title: string;
  description: string;
  buttonText: string;
  consentText: string;
  source: string;
  successTitle: string;
  successText: string;
}

const SEGMENTS: Record<LeadSegment, SegmentConfig> = {
  "fee-audit": {
    badge: "Free Download",
    title: "2026 Fee Audit PDF",
    description: "See exactly what every Australian broker charges — brokerage, FX fees, inactivity fees, and hidden costs. Compare side-by-side in one document.",
    buttonText: "Get the Free PDF",
    consentText: "I agree to receive the Fee Audit PDF and occasional updates from Invest.com.au.",
    source: "lead-magnet-fee-audit",
    successTitle: "Check your inbox!",
    successText: "We've sent the 2026 Fee Audit to your email.",
  },
  "smsf-checklist": {
    badge: "Free SMSF Resource",
    title: "SMSF Broker Checklist",
    description: "Our 12-point checklist for choosing an SMSF-compatible broker: custody, compliance, reporting, fees, and audit readiness. One PDF, zero jargon.",
    buttonText: "Get the SMSF Checklist",
    consentText: "I agree to receive the SMSF Checklist and occasional updates from Invest.com.au.",
    source: "lead-magnet-smsf-checklist",
    successTitle: "It's on its way!",
    successText: "We've sent the SMSF Broker Checklist to your email.",
  },
  "us-shares-guide": {
    badge: "Free Guide",
    title: "US Shares From Australia Guide",
    description: "Everything you need to know about buying US shares from Australia: FX fees explained, W-8BEN tax forms, fractional shares, and which brokers to use.",
    buttonText: "Get the Free Guide",
    consentText: "I agree to receive the US Shares Guide and occasional updates from Invest.com.au.",
    source: "lead-magnet-us-shares-guide",
    successTitle: "Check your inbox!",
    successText: "We've sent the US Shares Guide to your email.",
  },
  "switching-checklist": {
    badge: "Free Checklist",
    title: "Broker Switching Checklist",
    description: "Step-by-step guide to switching brokers without losing money: transfer fees, HIN portability, tax implications, and a timeline for the switch.",
    buttonText: "Get the Switching Checklist",
    consentText: "I agree to receive the Switching Checklist and occasional updates from Invest.com.au.",
    source: "lead-magnet-switching-checklist",
    successTitle: "On its way!",
    successText: "We've sent the Broker Switching Checklist to your email.",
  },
  "beginner-guide": {
    badge: "Free Beginner Guide",
    title: "How to Start Investing in Australia",
    description: "A plain-English guide for absolute beginners: how to pick a broker, what to buy first, how much you need, and common mistakes to avoid.",
    buttonText: "Get the Beginner Guide",
    consentText: "I agree to receive the Beginner Guide and occasional updates from Invest.com.au.",
    source: "lead-magnet-beginner-guide",
    successTitle: "Check your inbox!",
    successText: "We've sent the Beginner Guide to your email.",
  },
};

export default function ContextualLeadMagnet({ segment = "fee-audit" }: { segment?: LeadSegment }) {
  const config = SEGMENTS[segment];
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@") || !consent) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: config.source }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
        trackEvent("pdf_opt_in", { source: config.source, segment });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl p-6 bg-green-50 border border-green-200 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wider mb-2 text-green-700">
        {config.badge}
      </div>
      <h3 className="text-xl font-extrabold mb-2 text-slate-900">{config.title}</h3>
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">{config.description}</p>

      {status === "success" ? (
        <div className="bg-green-100 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold mb-1 text-green-900">{config.successTitle}</div>
          <p className="text-sm text-slate-600">{config.successText}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-green-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700"
          />
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-0.5 w-4 h-4 rounded border-green-300 accent-green-700 shrink-0"
            />
            <span className="text-[0.65rem] text-slate-500 leading-tight">
              {config.consentText}{" "}
              View our{" "}
              <Link href="/privacy" className="underline hover:text-green-700">Privacy Policy</Link>.
              You can unsubscribe at any time.
            </span>
          </label>
          <button
            type="submit"
            disabled={status === "loading" || !consent}
            className="w-full px-4 py-2.5 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "Sending..." : config.buttonText}
          </button>
          {status === "error" && (
            <p className="text-xs text-red-500 text-center">Something went wrong. Please try again.</p>
          )}
        </form>
      )}
    </div>
  );
}
