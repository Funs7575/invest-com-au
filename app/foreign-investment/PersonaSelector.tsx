"use client";

import { useState } from "react";
import Link from "next/link";
import type { ForeignInvestorPersona } from "@/lib/foreign-investment-data";

interface Props {
  personas: ForeignInvestorPersona[];
}

export default function PersonaSelector({ personas }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const active = personas.find((p) => p.id === selected);

  return (
    <div>
      {/* Persona cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(selected === p.id ? null : p.id)}
            className={`text-left rounded-2xl border-2 p-5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
              selected === p.id
                ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-500/10"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow"
            }`}
          >
            <div className="text-2xl mb-2">
              {p.id === "non-resident" ? "🌏" : p.id === "temp-visa" ? "🪪" : p.id === "new-pr" ? "🏅" : "✈️"}
            </div>
            <h3 className={`text-sm font-extrabold mb-1 ${selected === p.id ? "text-amber-800" : "text-slate-900"}`}>
              {p.label}
            </h3>
            <p className="text-xs text-slate-500 leading-snug">{p.description}</p>
            <div className={`mt-2 text-xs font-bold transition-colors ${selected === p.id ? "text-amber-600" : "text-slate-400"}`}>
              {selected === p.id ? "Selected ✓" : "Select →"}
            </div>
          </button>
        ))}
      </div>

      {/* Expanded content for selected persona */}
      {active && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-lg p-6 animate-fade-in">
          <div className="flex items-start gap-4 mb-5">
            <div className="text-3xl">
              {active.id === "non-resident" ? "🌏" : active.id === "temp-visa" ? "🪪" : active.id === "new-pr" ? "🏅" : "✈️"}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">{active.label}</h3>
              <p className="text-sm text-slate-600">{active.description}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Key concerns */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">Your key considerations</p>
              <ul className="space-y-2">
                {active.keyConcerns.map((concern, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-amber-500 font-bold mt-0.5 shrink-0">→</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended pages + advisor */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Pages you should read</p>
              <div className="space-y-2 mb-5">
                {active.primaryPages.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    className="flex items-center justify-between bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl px-4 py-3 transition-all group"
                  >
                    <span className="text-sm font-semibold text-slate-800 group-hover:text-amber-800">{page.label}</span>
                    <span className="text-amber-500 font-bold text-base">&rarr;</span>
                  </Link>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-800 mb-1">Recommended advisor type</p>
                <p className="text-sm text-slate-700 mb-3">{active.advisorType}</p>
                <Link
                  href="/advisors/tax-agents"
                  className="inline-block text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                >
                  Find a verified advisor &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
