"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import type { Advisor, Stats, CategoryPricing, BillingRecord, ViewType } from "./types";
import { logger } from "@/lib/logger";

const log = logger("advisor-portal-billing");

type TopupRecord = { id: number; amount_cents: number; status: string; created_at: string };

type Props = {
  advisor: Advisor | null;
  stats: Stats | null;
  categoryPricing: CategoryPricing | null;
  billing: BillingRecord[];
  onNavigate: (v: ViewType) => void;
};

export default function BillingTab({ advisor, stats, categoryPricing, billing, onNavigate }: Props) {
  const [topupHistory, setTopupHistory] = useState<TopupRecord[]>([]);

  useEffect(() => {
    fetch("/api/advisor-auth/topup")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setTopupHistory(d.topups || []); })
      .catch(() => {});
  }, []);

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Billing & Credits</h1>
      <p className="text-sm text-slate-500 mb-6">Purchase lead credits and view your payment history.</p>

      {/* Current balance */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-violet-900">Credit Balance</h3>
          <span className="text-2xl font-extrabold text-violet-900">${((advisor?.credit_balance_cents || 0) / 100).toFixed(0)}</span>
        </div>
        <p className="text-xs text-violet-600">
          ~{Math.floor((advisor?.credit_balance_cents || 0) / (advisor?.lead_price_cents || categoryPricing?.price_cents || 4900))} leads remaining · ${((advisor?.lead_price_cents || categoryPricing?.price_cents || 4900) / 100).toFixed(0)}/lead · Lifetime spend: ${((advisor?.lifetime_lead_spend_cents || 0) / 100).toFixed(0)}
        </p>
      </div>

      {/* Credit Packs */}
      <h2 className="text-base font-bold text-slate-900 mb-3">Buy Lead Credits</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {[
          { name: "Starter", leads: 5, price: 199, perLead: 39.80, slug: "starter", badge: "", desc: "Perfect for testing" },
          { name: "Growth", leads: 12, price: 449, perLead: 37.42, slug: "growth", badge: "Most Popular", desc: "Best for most advisors" },
          { name: "Scale", leads: 25, price: 799, perLead: 31.96, slug: "scale", badge: "Best Value", desc: "20% savings per lead" },
        ].map((pack) => (
          <div key={pack.slug} className={`relative bg-white border rounded-xl p-5 text-center ${pack.slug === "growth" ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200"}`}>
            {pack.badge && (
              <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[0.6rem] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                pack.slug === "growth" ? "bg-violet-600 text-white" : "bg-emerald-100 text-emerald-700"
              }`}>{pack.badge}</span>
            )}
            <h3 className="text-sm font-bold text-slate-900 mt-1">{pack.name}</h3>
            <div className="text-3xl font-extrabold text-slate-900 my-2">${pack.price}</div>
            <p className="text-xs text-slate-500 mb-1">{pack.leads} exclusive leads</p>
            <p className="text-xs text-slate-400 mb-3">${pack.perLead.toFixed(2)} per lead</p>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/api/advisor-auth/topup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount_cents: pack.price * 100, pack_slug: pack.slug }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else alert(data.error || "Failed to create checkout session. Please try again.");
                } catch (err) {
                  alert("Something went wrong. Please check you're logged in and try again.");
                  log.error("topup checkout failed", { err: err instanceof Error ? err.message : String(err) });
                }
              }}
              className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                pack.slug === "growth"
                  ? "bg-violet-600 text-white hover:bg-violet-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Buy {pack.name}
            </button>
            <p className="text-[0.6rem] text-slate-400 mt-2">{pack.desc}</p>
          </div>
        ))}
      </div>

      {/* Featured Advisor */}
      <h2 className="text-base font-bold text-slate-900 mb-3">Boost Your Visibility</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        <div className="bg-white border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="star" size={18} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Featured Advisor</h3>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mb-1">$149<span className="text-sm font-normal text-slate-400">/month</span></div>
          <ul className="text-xs text-slate-600 space-y-1 mb-3">
            <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Featured badge on your profile</li>
            <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Priority listing on city pages</li>
            <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Gold border on search results</li>
            <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Monthly performance report</li>
          </ul>
          {advisor?.featured_until && new Date(advisor.featured_until) > new Date() ? (
            <p className="text-xs text-amber-700 font-semibold">Active until {new Date(advisor.featured_until).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
          ) : (
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/api/advisor-auth/topup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount_cents: 14900, pack_slug: "featured_monthly" }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else alert(data.error || "Failed to create checkout session. Please try again.");
                } catch (err) {
                  alert("Something went wrong. Please check you're logged in and try again.");
                  log.error("featured topup checkout failed", { err: err instanceof Error ? err.message : String(err) });
                }
              }}
              className="w-full py-2 rounded-lg text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all"
            >
              Get Featured
            </button>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="file-text" size={18} className="text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900">Expert Article</h3>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mb-1">$299<span className="text-sm font-normal text-slate-400">/article</span></div>
          <ul className="text-xs text-slate-600 space-y-1 mb-3">
            <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />SEO-optimised article on invest.com.au</li>
            <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Permanent placement with your byline</li>
            <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Backlink to your advisor profile</li>
            <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Builds your E-E-A-T authority</li>
          </ul>
          <button
            onClick={() => onNavigate("articles")}
            className="w-full py-2 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
          >
            Write an Article →
          </button>
        </div>
      </div>

      <h2 className="text-base font-bold text-slate-900 mb-3">Payment History</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 font-medium">Total Charged</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">${((stats?.totalBilledCents || 0) / 100).toFixed(0)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500 font-medium">Outstanding</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">${((stats?.pendingBilledCents || 0) / 100).toFixed(0)}</div>
        </div>
      </div>

      {/* Lead billing records */}
      <h2 className="text-base font-bold text-slate-900 mb-3">Lead Charges</h2>
      {billing.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
          <div className="grid grid-cols-4 bg-slate-50 text-xs font-semibold text-slate-600 px-4 py-2 border-b border-slate-200">
            <span>Date</span>
            <span>Description</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Status</span>
          </div>
          {billing.map((b) => (
            <div key={b.id} className="grid grid-cols-4 px-4 py-2.5 text-xs border-b border-slate-100 last:border-b-0">
              <span className="text-slate-500">{new Date(b.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
              <span className="text-slate-700">{b.description}</span>
              <span className="text-right font-semibold text-slate-900">${(b.amount_cents / 100).toFixed(2)}</span>
              <span className="text-right">
                <span className={`px-1.5 py-0.5 rounded-full text-[0.56rem] font-bold ${
                  b.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                  b.status === "waived" ? "bg-slate-100 text-slate-500" :
                  "bg-amber-100 text-amber-700"
                }`}>{b.status}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center mb-8">
          <p className="text-sm text-slate-500">No lead charges yet.</p>
        </div>
      )}

      {/* Credit topup history */}
      <h2 className="text-base font-bold text-slate-900 mb-3">Top-up History</h2>
      {topupHistory.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 bg-slate-50 text-xs font-semibold text-slate-600 px-4 py-2 border-b border-slate-200">
            <span>Date</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Status</span>
          </div>
          {topupHistory.map((t) => (
            <div key={t.id} className="grid grid-cols-3 px-4 py-2.5 text-xs border-b border-slate-100 last:border-b-0">
              <span className="text-slate-500">{new Date(t.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span className="text-right font-semibold text-slate-900">${(t.amount_cents / 100).toFixed(0)}</span>
              <span className="text-right">
                <span className={`px-1.5 py-0.5 rounded-full text-[0.56rem] font-bold ${
                  t.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                  t.status === "failed" ? "bg-red-100 text-red-700" :
                  "bg-amber-100 text-amber-700"
                }`}>{t.status}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <p className="text-sm text-slate-500">No top-ups yet. Purchase credits above to get started.</p>
        </div>
      )}
    </>
  );
}
