"use client";

/**
 * FIPersonaRouter — "What brings you here?" three-choice selector on the
 * Foreign Investment hub.
 *
 * Three journeys map to high-intent expat/foreign-investor needs:
 *   1. Moving to Australia    → /foreign-investment/journey (country picker)
 *   2. Leaving Australia      → /foreign-investment/super (DASP + super guide)
 *   3. Non-resident investor  → existing hub content (#find-your-situation)
 *
 * This is a routing/UX helper, not a financial-advice tool. All copy is
 * factual and directional — linking to the appropriate guide page.
 *
 * AFSL: no product recommendations, no personal advice.
 */

import { useState } from "react";
import Link from "next/link";

interface Journey {
  id: string;
  emoji: string;
  label: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLinks: { label: string; href: string }[];
  keyPoints: string[];
}

const JOURNEYS: Journey[] = [
  {
    id: "moving-to-au",
    emoji: "✈️",
    label: "Moving to Australia",
    description:
      "You're planning to migrate or are in the process of moving to Australia.",
    ctaLabel: "Start the migration investing journey",
    ctaHref: "/foreign-investment/journey",
    secondaryLinks: [
      { label: "Tax on arrival — rebasing & residency", href: "/foreign-investment/tax" },
      { label: "Pension / super transfer options", href: "/foreign-investment/super" },
      { label: "FIRB & property as a new resident", href: "/foreign-investment/property" },
    ],
    keyPoints: [
      "Tax residency starts on your first day physically in Australia",
      "Foreign assets have a deemed acquisition at market value on residency start date — important for CGT",
      "Overseas pension transfers have country-specific rules (QROPS for UK; KiwiSaver for NZ)",
      "Once you hold PR, FIRB approval is no longer required for property",
    ],
  },
  {
    id: "leaving-au",
    emoji: "🛫",
    label: "Leaving Australia",
    description:
      "You're departing Australia and need to manage your super, tax position, and assets.",
    ctaLabel: "Super & DASP guide for departing residents",
    ctaHref: "/foreign-investment/super",
    secondaryLinks: [
      { label: "DASP calculator (estimate your super payout)", href: "/tools/dasp-calculator" },
      { label: "Selling AU investments before you leave", href: "/foreign-investment/tax" },
      { label: "Non-resident CGT after departure", href: "/foreign-investment/tax" },
    ],
    keyPoints: [
      "Temp visa holders can claim super via DASP — but 35% (or 65% for WHM) is withheld by the ATO",
      "Australian citizens and PR holders cannot access super via DASP — it stays until preservation age",
      "Departing can trigger a change in tax residency — losing the CGT 50% discount and tax-free threshold",
      "Selling AU property as a non-resident has different CGT rules — no main-residence exemption",
    ],
  },
  {
    id: "non-resident-investor",
    emoji: "🌏",
    label: "Non-Resident Investor",
    description:
      "You live overseas and want to invest in Australian shares, property, or other assets.",
    ctaLabel: "Browse country-specific investing guides",
    ctaHref: "/foreign-investment/journey",
    secondaryLinks: [
      { label: "Withholding tax calculator", href: "/tools/withholding-tax-calculator" },
      { label: "Compare countries — tax & FIRB", href: "/foreign-investment/compare" },
      { label: "Brokers that accept non-residents", href: "/foreign-investment/shares" },
    ],
    keyPoints: [
      "Non-residents are taxed on Australian-sourced income — withholding tax applies automatically",
      "A Double Tax Agreement (DTA) between your country and Australia may reduce withholding rates",
      "FIRB approval required for property — established dwelling ban active until March 2027",
      "No tax-free threshold for non-residents — tax applies from the first dollar",
    ],
  },
];

export default function FIPersonaRouter() {
  const [selected, setSelected] = useState<string | null>(null);

  const active = JOURNEYS.find((j) => j.id === selected);

  return (
    <div>
      {/* Journey cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {JOURNEYS.map((j) => (
          <button
            key={j.id}
            type="button"
            onClick={() => setSelected(selected === j.id ? null : j.id)}
            className={`text-left rounded-2xl border-2 p-5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
              selected === j.id
                ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-500/10"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow"
            }`}
          >
            <div className="text-3xl mb-2" aria-hidden="true">{j.emoji}</div>
            <span
              className={`block text-sm font-extrabold mb-1 ${
                selected === j.id ? "text-amber-800" : "text-slate-900"
              }`}
            >
              {j.label}
            </span>
            <p className="text-xs text-slate-500 leading-snug">
              {j.description}
            </p>
            <div
              className={`mt-2 text-xs font-bold transition-colors ${
                selected === j.id ? "text-amber-600" : "text-slate-500"
              }`}
            >
              {selected === j.id ? "Selected ✓" : "Select →"}
            </div>
          </button>
        ))}
      </div>

      {/* Expanded journey detail */}
      {active && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-lg p-6 animate-fade-in">
          <div className="flex items-start gap-4 mb-5">
            <div className="text-3xl" aria-hidden="true">{active.emoji}</div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-0.5">
                {active.label}
              </h3>
              <p className="text-sm text-slate-600">{active.description}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Key points */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">
                Key things to know
              </p>
              <ul className="space-y-2">
                {active.keyPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-slate-700"
                  >
                    <span className="text-amber-500 font-bold mt-0.5 shrink-0">
                      →
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA + secondary links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Where to go next
              </p>
              <Link
                href={active.ctaHref}
                className="block w-full text-center px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold rounded-xl text-sm transition-colors shadow mb-4"
              >
                {active.ctaLabel} →
              </Link>
              <div className="space-y-2">
                {active.secondaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl px-4 py-2.5 transition-all group"
                  >
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-amber-800">
                      {link.label}
                    </span>
                    <span className="text-amber-500 font-bold text-base">&rarr;</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
