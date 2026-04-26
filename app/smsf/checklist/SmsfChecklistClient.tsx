"use client";

import { useState, useMemo, type FormEvent } from "react";
import Icon from "@/components/Icon";

type Item = {
  id: string;
  label: string;
  why: string;
  category: "setup" | "ongoing" | "review";
};

const ITEMS: Item[] = [
  { id: "deed",        label: "Trust deed signed and current",                    why: "Out-of-date deeds don't authorise modern strategies (crypto, LRBA). Update every 3–5 years.", category: "setup" },
  { id: "ato",         label: "Registered with ATO (ABN + TFN)",                  why: "Required to be regulated as an SMSF and receive concessional tax treatment.", category: "setup" },
  { id: "bank",        label: "Dedicated SMSF bank account opened",               why: "Never commingle. Auditor will flag any personal money in the fund account.", category: "setup" },
  { id: "strategy",    label: "Investment strategy documented",                    why: "ATO legal requirement. Must address risk, return, diversification, liquidity, insurance.", category: "setup" },
  { id: "insurance",   label: "Member insurance reviewed",                        why: "Each member's life/TPD/income-protection coverage must be considered and documented.", category: "setup" },
  { id: "audit",       label: "Annual audit by ASIC-approved auditor",            why: "Mandatory every year. Auditor must be independent of the accountant.", category: "ongoing" },
  { id: "tax-return",  label: "SMSF annual return lodged",                        why: "Includes income-tax return, regulatory return and member contributions reporting.", category: "ongoing" },
  { id: "members",     label: "Member statements issued annually",                why: "Each member must receive a statement showing balances and any transactions.", category: "ongoing" },
  { id: "valuation",   label: "Market valuation of all assets at 30 June",        why: "Required for the audit. Property, unlisted assets and crypto must have evidence-backed valuations.", category: "ongoing" },
  { id: "contribs",    label: "Concessional / non-concessional contributions tracked", why: "Cap breaches trigger excess contribution tax. Track monthly, not at year-end.", category: "ongoing" },
  { id: "review",      label: "Investment strategy reviewed annually (or on event)", why: "Pension start, member changes, large contributions all trigger a review at the time.", category: "review" },
  { id: "actuary",     label: "Actuarial certificate (if mixed accumulation/pension)", why: "Required when fund has both accumulation and pension members during the year.", category: "review" },
];

const CATEGORIES: Array<{ id: Item["category"]; title: string }> = [
  { id: "setup", title: "Setup" },
  { id: "ongoing", title: "Ongoing" },
  { id: "review", title: "Review" },
];

export default function SmsfChecklistClient() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const progressPct = useMemo(() => Math.round((checked.size / ITEMS.length) * 100), [checked]);

  async function onEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    if (!email) return;
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "smsf_checklist" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setEmailError(j?.error || "Could not save email — try again.");
        return;
      }
      setEmailSubmitted(true);
    } catch {
      setEmailError("Network error — try again.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500">Progress</p>
          <p className="text-sm font-bold text-slate-700">{checked.size} of {ITEMS.length} ({progressPct}%)</p>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>

        {CATEGORIES.map((cat) => {
          const items = ITEMS.filter((i) => i.category === cat.id);
          return (
            <div key={cat.id} className="mb-6 last:mb-0">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-600 mb-3">{cat.title}</h2>
              <ul className="space-y-2">
                {items.map((item) => {
                  const isChecked = checked.has(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors ${
                          isChecked ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isChecked ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300"
                        }`}>
                          {isChecked && <Icon name="check" size={12} className="text-white" />}
                        </span>
                        <span>
                          <span className={`block text-sm font-bold ${isChecked ? "text-emerald-900 line-through" : "text-slate-900"}`}>
                            {item.label}
                          </span>
                          <span className="block text-xs text-slate-600 mt-0.5 leading-relaxed">{item.why}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {!emailSubmitted ? (
        <form onSubmit={onEmail} className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900 mb-2">Email me this checklist</h3>
          <p className="text-sm text-slate-600 mb-4">We&rsquo;ll send a copy you can refer back to and add quarterly reminders.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm px-5 py-2.5 transition-colors"
            >
              Email it <Icon name="mail" size={14} />
            </button>
          </div>
          {emailError && <p className="mt-2 text-xs text-red-600">{emailError}</p>}
        </form>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <Icon name="check-circle" size={28} className="text-emerald-600 mx-auto mb-2" />
          <p className="font-bold text-emerald-900">Sent — check your inbox.</p>
        </div>
      )}
    </div>
  );
}
