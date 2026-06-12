"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { FIRB_DISCLAIMER } from "@/lib/compliance";
import {
  FIRB_BUYER_STATUS_OPTIONS,
  FIRB_PROPERTY_TYPE_OPTIONS,
  resolveFirbEligibility,
  type FirbBuyerStatus,
  type FirbPropertyType,
  type FirbVerdict,
} from "@/lib/firb-eligibility";

/**
 * Two-question educational walkthrough of the published FIRB rules.
 * Pure presentation over lib/firb-eligibility — the readout describes what
 * the rules generally say and always routes to a professional; it never
 * gives a personal verdict (REGULATORY-AVOID-LIST: no FIRB legal advice).
 */

const VERDICT_STYLE: Record<FirbVerdict, { card: string; iconBg: string; icon: string; iconColor: string }> = {
  no_approval_needed: { card: "border-emerald-200 bg-emerald-50", iconBg: "bg-emerald-100", icon: "check-circle", iconColor: "text-emerald-600" },
  generally_approved: { card: "border-blue-200 bg-blue-50", iconBg: "bg-blue-100", icon: "clipboard-list", iconColor: "text-blue-600" },
  banned_window: { card: "border-red-200 bg-red-50", iconBg: "bg-red-100", icon: "alert-triangle", iconColor: "text-red-600" },
  not_approved: { card: "border-red-200 bg-red-50", iconBg: "bg-red-100", icon: "x-circle", iconColor: "text-red-600" },
};

function OptionGrid<T extends string>({
  legend,
  options,
  value,
  onChange,
  name,
}: {
  legend: string;
  options: { value: T; label: string; hint: string }[];
  value: T | null;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-slate-900 mb-2">{legend}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-colors ${
                selected
                  ? "border-amber-500 ring-2 ring-amber-300 bg-amber-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="mt-0.5 accent-amber-500"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                <span className="block text-xs text-slate-500 leading-snug">{opt.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function FirbEligibilityWalkthrough() {
  const [status, setStatus] = useState<FirbBuyerStatus | null>(null);
  const [property, setProperty] = useState<FirbPropertyType | null>(null);

  const readout = useMemo(
    () => (status && property ? resolveFirbEligibility(status, property) : null),
    [status, property],
  );

  return (
    <div className="space-y-6">
      <OptionGrid
        legend="1. Which best describes the buyer?"
        name="firb-buyer-status"
        options={FIRB_BUYER_STATUS_OPTIONS}
        value={status}
        onChange={setStatus}
      />
      <OptionGrid
        legend="2. What type of property?"
        name="firb-property-type"
        options={FIRB_PROPERTY_TYPE_OPTIONS}
        value={property}
        onChange={setProperty}
      />

      {readout ? (
        <div
          aria-live="polite"
          className={`rounded-2xl border p-5 ${VERDICT_STYLE[readout.verdict].card}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${VERDICT_STYLE[readout.verdict].iconBg}`}
              aria-hidden="true"
            >
              <Icon name={VERDICT_STYLE[readout.verdict].icon} size={20} className={VERDICT_STYLE[readout.verdict].iconColor} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                What the published rules say
              </p>
              <h3 className="text-base font-extrabold text-slate-900">{readout.title}</h3>
              <p className="text-sm text-slate-700 leading-relaxed mt-1.5">{readout.summary}</p>
              <ul className="mt-3 space-y-1.5">
                {readout.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                    <Icon name="check" size={13} className="mt-0.5 shrink-0 text-slate-500" />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {readout.ctas.map((cta, i) => (
                  <Link
                    key={cta.href}
                    href={cta.href}
                    className={
                      i === 0
                        ? "inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                        : "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    }
                  >
                    {cta.label}
                    <Icon name="arrow-right" size={12} />
                  </Link>
                ))}
                <Link
                  href="/firb-fee-estimator"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Estimate FIRB fees
                  <Icon name="calculator" size={12} />
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-4 border-t border-slate-200/70 pt-3 text-[11px] leading-relaxed text-slate-500">
            {FIRB_DISCLAIMER}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          <p className="text-sm text-slate-500">
            Answer both questions to see what the published FIRB rules generally say for that combination.
          </p>
        </div>
      )}
    </div>
  );
}
