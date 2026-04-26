"use client";

import { useState, useMemo } from "react";
import Icon from "@/components/Icon";
import HubLeadForm from "@/components/leads/HubLeadForm";

type Phase = "12mo" | "6mo" | "3mo" | "atSale";

type Item = { id: string; phase: Phase; label: string; why: string };

const ITEMS: Item[] = [
  { id: "financials",  phase: "12mo",   label: "Clean up financial statements",                  why: "Buyers want three full years of formal-close monthly numbers — not bookkeeping shortcuts." },
  { id: "systems",     phase: "12mo",   label: "Document all systems and SOPs",                  why: "One-page SOPs per function. Owner-dependent businesses sell at lower multiples." },
  { id: "contracts",   phase: "12mo",   label: "Review all contracts and assign properly",       why: "Customer, supplier and lease contracts must be transferable to a new owner." },
  { id: "ip",          phase: "12mo",   label: "Check IP ownership",                             why: "Domains, trademarks and code should be in the company name, not the founder's." },
  { id: "valuation",   phase: "6mo",    label: "Get professional valuation",                     why: "Establishes a defensible asking price and surfaces value gaps you can still close." },
  { id: "broker",      phase: "6mo",    label: "Find broker",                                    why: "Industry-specific brokers have buyer pools your generalist agent doesn't." },
  { id: "im",          phase: "6mo",    label: "Prepare information memorandum",                 why: "The IM is the first impression — bad IMs disqualify your business before a buyer asks a question." },
  { id: "data-room",   phase: "3mo",    label: "Data room ready",                                why: "Complete contracts, financials, employment records, IP register, organisational chart, KPIs." },
  { id: "weakness",    phase: "3mo",    label: "Address weaknesses",                             why: "Customer concentration, key-person risk and litigation hairs all reduce the sale price." },
  { id: "tax-brief",   phase: "3mo",    label: "Brief accountant on structure",                  why: "Sale structure (asset vs share sale) drives the CGT outcome — get this right early." },
  { id: "structure",   phase: "atSale", label: "Tax structure optimised",                        why: "Pre-sale entity reorgs are usually only effective if completed 12+ months before sale." },
  { id: "cgt",         phase: "atSale", label: "CGT concessions assessed",                       why: "15-year exemption, 50% reduction, retirement and rollover concessions can stack." },
  { id: "earnout",     phase: "atSale", label: "Earnout terms understood",                       why: "Earnouts shift risk to the seller — model the conditions, payment timing and dispute clauses." },
];

const PHASES: Array<{ id: Phase; title: string; subtitle: string }> = [
  { id: "12mo",  title: "12 months out", subtitle: "Preparation" },
  { id: "6mo",   title: "6 months out",  subtitle: "Engagement" },
  { id: "3mo",   title: "3 months out",  subtitle: "Final tightening" },
  { id: "atSale", title: "At sale",       subtitle: "Execution" },
];

export default function SellChecklistClient() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const progressPct = useMemo(() => Math.round((checked.size / ITEMS.length) * 100), [checked]);

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

        {PHASES.map((p) => {
          const items = ITEMS.filter((i) => i.phase === p.id);
          return (
            <div key={p.id} className="mb-6 last:mb-0">
              <div className="flex items-baseline gap-3 mb-3">
                <h2 className="text-base font-extrabold text-slate-900">{p.title}</h2>
                <span className="text-xs uppercase tracking-wider font-extrabold text-amber-600">{p.subtitle}</span>
              </div>
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
                          <span className={`block text-sm font-bold ${isChecked ? "text-emerald-900 line-through" : "text-slate-900"}`}>{item.label}</span>
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

      <HubLeadForm
        heading="Talk to a business broker about your exit"
        subheading="Industry-specific brokers will identify the steps that matter most for your situation and run a comparable analysis on recent transactions."
        intent={{ need: "planning", context: ["estate_planning"] }}
        source="sell_business_checklist"
        ctaLabel="Get matched with a broker"
      />
    </div>
  );
}
