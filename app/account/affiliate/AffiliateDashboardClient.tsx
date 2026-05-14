"use client";

import { useState } from "react";

import type { ProAffiliateStats } from "@/lib/pro-affiliate/track";

interface Props {
  proName: string;
  shareToken: string;
  shareUrl: string;
  redirectUrl: string;
  stats: ProAffiliateStats;
}

export default function AffiliateDashboardClient({
  proName,
  shareToken,
  shareUrl,
  redirectUrl,
  stats,
}: Props) {
  const [copied, setCopied] = useState<"share" | "redirect" | null>(null);

  function copy(value: string, which: "share" | "redirect") {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Affiliate program</h1>
        <p className="mt-2 text-slate-600">
          Share your personal landing page on LinkedIn. Earn credits when your
          audience signs up, posts a brief, or has a brief accepted.
        </p>
      </header>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Your share link
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Post this on LinkedIn, in your email signature, or your website. Every
          click is credited to {proName} for 90 days.
        </p>
        <div className="mt-5 space-y-3">
          <div className="flex items-stretch gap-2">
            <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-mono truncate">
              {shareUrl}
            </code>
            <button
              type="button"
              onClick={() => copy(shareUrl, "share")}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 text-sm"
            >
              {copied === "share" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex items-stretch gap-2">
            <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-mono truncate">
              {redirectUrl}
            </code>
            <button
              type="button"
              onClick={() => copy(redirectUrl, "redirect")}
              className="rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium px-4 py-2 text-sm"
            >
              {copied === "redirect" ? "Copied" : "Copy redirect"}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Token: <span className="font-mono">{shareToken}</span>. The redirect
            URL drops a 90-day cookie and sends visitors to Get Matched with
            attribution stamped.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Clicks" value={stats.click_count} />
        <Stat label="Signups" value={stats.signup_count} />
        <Stat label="Briefs created" value={stats.brief_count} />
        <Stat label="Credits earned" value={stats.credits_earned} accent />
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${
          accent ? "text-emerald-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
