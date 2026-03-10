"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

const CATEGORIES = [
  { value: "", label: "No category" },
  { value: "shares", label: "Shares / Trading" },
  { value: "crypto", label: "Crypto" },
  { value: "beginner", label: "Beginner" },
  { value: "savings", label: "Savings" },
  { value: "super", label: "Super" },
  { value: "robo", label: "Robo-Advisor" },
  { value: "cfd", label: "CFDs / Forex" },
];

export default function BrokerDealsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [brokerSlug, setBrokerSlug] = useState("");
  const [brokerName, setBrokerName] = useState("");

  // Deal form state
  const [enabled, setEnabled] = useState(false);
  const [dealText, setDealText] = useState("");
  const [dealExpiry, setDealExpiry] = useState("");
  const [dealTerms, setDealTerms] = useState("");
  const [dealCategory, setDealCategory] = useState("");
  const [lastVerified, setLastVerified] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug, company_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!account) return;
      setBrokerSlug(account.broker_slug);
      setBrokerName(account.company_name || account.broker_slug);

      // Fetch current deal
      const res = await fetch("/api/broker-portal/deals");
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.deal || false);
        setDealText(data.deal_text || "");
        setDealExpiry(data.deal_expiry || "");
        setDealTerms(data.deal_terms || "");
        setDealCategory(data.deal_category || "");
        setLastVerified(data.deal_verified_date || null);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      const res = await fetch("/api/broker-portal/deals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_enabled: enabled,
          deal_text: dealText,
          deal_expiry: dealExpiry || null,
          deal_terms: dealTerms,
          deal_category: dealCategory || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
      } else {
        setSuccess(true);
        setLastVerified(new Date().toISOString());
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const daysUntilExpiry = dealExpiry ? Math.ceil((new Date(dealExpiry).getTime() - Date.now()) / 86400000) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Manage Your Deal</h1>
          <p className="text-sm text-slate-500">Post a promotional offer that appears across the site — on your broker page, deals hub, comparison tables, and homepage.</p>
        </div>
      </div>

      {/* Live preview */}
      {enabled && dealText && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <p className="text-[0.6rem] font-bold text-emerald-600 uppercase tracking-wide mb-1">Live Preview</p>
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
              {brokerName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{brokerName}</p>
              <p className="text-xs text-slate-700 mt-0.5">{dealText}</p>
              {dealExpiry && (
                <p className={`text-[0.6rem] mt-1 ${isExpired ? "text-red-500" : isExpiringSoon ? "text-amber-600" : "text-slate-400"}`}>
                  {isExpired ? "Expired" : `Expires ${new Date(dealExpiry).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`}
                  {isExpiringSoon && ` (${daysUntilExpiry} days left)`}
                </p>
              )}
            </div>
            <span className="text-[0.5rem] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full shrink-0">DEAL</span>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Deal Active</p>
            <p className="text-xs text-slate-500">When enabled, your deal appears across the site</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-slate-200"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-6" : ""}`} />
          </button>
        </div>

        {enabled && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deal Text * <span className="font-normal text-slate-400">({dealText.length}/200)</span>
              </label>
              <textarea
                value={dealText}
                onChange={e => setDealText(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="e.g. $0 brokerage on all US shares for the first 30 days. Plus a free stock when you sign up."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
              />
              <p className="text-[0.6rem] text-slate-400 mt-1">This appears on your broker listing, the deals page, and comparison tables. Keep it punchy and specific.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={dealExpiry}
                  onChange={e => setDealExpiry(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <p className="text-[0.6rem] text-slate-400 mt-1">Optional. Deal auto-hides after this date.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={dealCategory}
                  onChange={e => setDealCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Terms &amp; Conditions <span className="font-normal text-slate-400">({dealTerms.length}/500)</span>
              </label>
              <textarea
                value={dealTerms}
                onChange={e => setDealTerms(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="e.g. Available to new customers only. Must be 18+. T&Cs apply — see website for full details. Offer valid until 30/06/2026."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
              />
              <p className="text-[0.6rem] text-slate-400 mt-1">Shown in fine print below the deal. Include eligibility and key conditions.</p>
            </div>
          </>
        )}

        {/* Status + save */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-400">
            {lastVerified && (
              <span>Last updated: {new Date(lastVerified).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-600 font-semibold">{error}</span>}
            {success && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Icon name="check" size={14} /> Saved</span>}
            <button
              onClick={handleSave}
              disabled={saving || (enabled && !dealText.trim())}
              className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving..." : enabled ? "Save & Publish Deal" : "Disable Deal"}
            </button>
          </div>
        </div>
      </div>

      {/* Where deals appear */}
      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-700 mb-2">Where your deal appears</h3>
        <div className="grid grid-cols-2 gap-2 text-[0.62rem] text-slate-500">
          <div className="flex items-center gap-1.5"><Icon name="check-circle" size={12} className="text-emerald-500" /> Your broker review page</div>
          <div className="flex items-center gap-1.5"><Icon name="check-circle" size={12} className="text-emerald-500" /> Deals &amp; Offers hub</div>
          <div className="flex items-center gap-1.5"><Icon name="check-circle" size={12} className="text-emerald-500" /> Homepage comparison table</div>
          <div className="flex items-center gap-1.5"><Icon name="check-circle" size={12} className="text-emerald-500" /> Category &quot;Best of&quot; pages</div>
          <div className="flex items-center gap-1.5"><Icon name="check-circle" size={12} className="text-emerald-500" /> Platform quiz results</div>
          <div className="flex items-center gap-1.5"><Icon name="check-circle" size={12} className="text-emerald-500" /> Versus comparison pages</div>
        </div>
        <p className="text-[0.55rem] text-slate-400 mt-2">Deals display immediately after saving. No approval needed. Expired deals are automatically hidden.</p>
      </div>
    </div>
  );
}
