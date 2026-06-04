"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CalculatorLeadCapture from "@/components/CalculatorLeadCapture";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import {
  calculateStateGrants,
  formatAud,
  STATE_LABELS,
  type AustralianState,
  type CoupleStatus,
  type PropertyType,
} from "@/lib/first-home-buyer/state-grants";

const STATE_OPTIONS = (Object.keys(STATE_LABELS) as AustralianState[]).map(
  (code) => ({ code, label: STATE_LABELS[code] }),
);

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "new_build", label: "New build" },
  { value: "established", label: "Established home" },
  { value: "land_and_build", label: "Land + build" },
];

const INCOME_BANDS = [
  { label: "Under $60k", cents: 50_000_00 },
  { label: "$60k–$125k", cents: 90_000_00 },
  { label: "$125k–$200k", cents: 160_000_00 },
  { label: "Over $200k", cents: 220_000_00 },
];

export default function StateGrantsCalculatorClient() {
  const [state, setState] = useState<AustralianState>("nsw");
  const [propertyType, setPropertyType] = useState<PropertyType>("new_build");
  const [purchasePriceK, setPurchasePriceK] = useState(700);
  const [incomeIndex, setIncomeIndex] = useState(1);
  const [coupleStatus, setCoupleStatus] = useState<CoupleStatus>("single");
  const [isRegional, setIsRegional] = useState(false);

  const householdIncomeCents = INCOME_BANDS[incomeIndex]?.cents ?? 90_000_00;

  const result = useMemo(
    () =>
      calculateStateGrants({
        state,
        propertyType,
        purchasePriceCents: purchasePriceK * 1000 * 100,
        householdIncomeCents,
        coupleStatus,
        isRegional,
      }),
    [
      state,
      propertyType,
      purchasePriceK,
      householdIncomeCents,
      coupleStatus,
      isRegional,
    ],
  );

  const netUpfrontBenefit =
    result.totalGrantCents + result.stampDutySavedCents;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <nav className="text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <Link href="/tools" className="hover:underline">Tools</Link>
        {" / "}
        <span className="text-slate-700">State Grants Calculator</span>
      </nav>

      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        First Home Buyer State Grants Calculator
      </h1>
      <p className="text-slate-600 mb-8">
        See your state&apos;s First Home Owner Grant, stamp-duty concession, and
        First Home Guarantee eligibility in one place. Picks federal + state
        levers that stack so you can plan the deposit ask.
      </p>

      {/* Inputs */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-6 space-y-6">
        <h2 className="font-semibold text-slate-800 text-lg">Your purchase</h2>

        <div>
          <label htmlFor="state-select" className="block text-sm font-medium text-slate-700 mb-2">
            State or territory
          </label>
          <select
            id="state-select"
            value={state}
            onChange={(e) => setState(e.target.value as AustralianState)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {STATE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {state === "vic" && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isRegional}
              onChange={(e) => setIsRegional(e.target.checked)}
              className="accent-violet-600"
            />
            Regional Victoria (unlocks the $10,000 regional bonus)
          </label>
        )}

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-2">
            Property type
          </span>
          <div className="grid grid-cols-3 gap-2">
            {PROPERTY_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPropertyType(opt.value)}
                className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
                  propertyType === opt.value
                    ? "border-violet-600 bg-violet-50 text-violet-800 font-semibold"
                    : "border-slate-200 text-slate-600 hover:border-violet-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="price-slider" className="block text-sm font-medium text-slate-700 mb-1">
            Purchase price
          </label>
          <div className="flex items-center gap-4">
            <input
              id="price-slider"
              type="range"
              min={300}
              max={1500}
              step={25}
              value={purchasePriceK}
              onChange={(e) => setPurchasePriceK(Number(e.target.value))}
              className="flex-1 accent-violet-600"
            />
            <span className="w-28 text-right font-semibold text-violet-700">
              ${purchasePriceK}k
            </span>
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-2">
            Household income{" "}
            <span className="text-slate-400 font-normal">
              (ACT duty concession test — the First Home Guarantee no longer
              has an income cap)
            </span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {INCOME_BANDS.map((band, i) => (
              <button
                key={band.label}
                type="button"
                onClick={() => setIncomeIndex(i)}
                className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
                  incomeIndex === i
                    ? "border-violet-600 bg-violet-50 text-violet-800 font-semibold"
                    : "border-slate-200 text-slate-600 hover:border-violet-300"
                }`}
              >
                {band.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-2">
            Applying as
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(["single", "couple"] as CoupleStatus[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setCoupleStatus(opt)}
                className={`text-sm px-3 py-2 rounded-lg border capitalize transition-colors ${
                  coupleStatus === opt
                    ? "border-violet-600 bg-violet-50 text-violet-800 font-semibold"
                    : "border-slate-200 text-slate-600 hover:border-violet-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section
        className="bg-violet-50 border border-violet-200 rounded-xl p-6 mb-6"
        aria-live="polite"
      >
        <h2 className="font-semibold text-violet-900 text-lg mb-5">
          Your state-grants estimate
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <ResultCard
            label="FHOG"
            value={formatAud(result.fhogCents)}
            highlight
          />
          <ResultCard
            label="Other grants"
            value={formatAud(result.additionalGrantsCents)}
          />
          <ResultCard
            label="Stamp duty saved"
            value={formatAud(result.stampDutySavedCents)}
            positive={result.stampDutySavedCents > 0}
          />
          <ResultCard
            label="Stamp duty payable"
            value={formatAud(result.stampDutyPayableCents)}
          />
        </div>

        <p className="text-violet-800 font-semibold">
          Upfront benefit: {formatAud(netUpfrontBenefit)}{" "}
          <span className="text-sm font-normal text-violet-700">
            (grants {formatAud(result.totalGrantCents)} + stamp-duty saving{" "}
            {formatAud(result.stampDutySavedCents)})
          </span>
        </p>

        {!result.fhogApplies && (
          <p className="mt-3 text-sm text-violet-900 bg-violet-100 border border-violet-300 rounded-lg p-3">
            <strong>FHOG not available:</strong> {result.fhogIneligibleReason}
          </p>
        )}

        <p
          className={`mt-3 text-sm rounded-lg p-3 border ${
            result.fhgEligible
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <strong>
            First Home Guarantee:{" "}
            {result.fhgEligible ? "Within price cap" : "Above price cap"}
          </strong>
          {" — "}
          {result.fhgEligible
            ? `buy with a 5% deposit, no LMI (no income cap or place limit since 1 Oct 2025). Capital-city / regional-centre cap is ${formatAud(
                result.fhgCapCents,
              )}; rest-of-state cap is lower (${formatAud(
                result.fhgRestOfStateCapCents,
              )}) — confirm your postcode's cap.`
            : `your purchase price is above this state's ${formatAud(
                result.fhgCapCents,
              )} capital-city cap.`}
        </p>

        {result.dutyEstimateCaveat && (
          <p className="mt-3 text-sm bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-3">
            {result.dutyEstimateCaveat}
          </p>
        )}
      </section>

      {/* Breakdown */}
      {result.breakdown.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-3">
            Breakdown — {STATE_LABELS[state]}
          </h2>
          <ul className="space-y-2 text-sm">
            {result.breakdown.map((row, i) => (
              <li
                key={`${row.label}-${i}`}
                className="flex justify-between items-center border-b border-slate-100 last:border-0 pb-2 last:pb-0"
              >
                <span className="text-slate-700">
                  {row.label}
                  {row.sourceUrl && (
                    <>
                      {" "}
                      <a
                        href={row.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 underline ml-1"
                      >
                        source
                      </a>
                    </>
                  )}
                </span>
                <span
                  className={`font-semibold tabular-nums ${
                    row.kind === "duty_payable"
                      ? "text-slate-700"
                      : "text-violet-800"
                  }`}
                >
                  {row.kind === "duty_payable" ? "−" : "+"}
                  {formatAud(row.cents)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            {result.stateNotes}
          </p>
        </section>
      )}

      {/* Lead capture (W1.2 pattern) */}
      <CalculatorLeadCapture
        calcSlug="state-grants-calculator"
        calcTitle="State Grants"
        need="mortgage"
        contextKeys={[
          `state:${state}`,
          `property:${propertyType}`,
          `price:${purchasePriceK}k`,
          `income:${INCOME_BANDS[incomeIndex]?.label ?? ""}`,
          coupleStatus,
          `benefit:${Math.round(netUpfrontBenefit / 100)}`,
        ]}
      />

      {/* Related tools */}
      <section className="mb-8 mt-8">
        <h2 className="font-semibold text-slate-800 mb-3">Related tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "FHSS Calculator", href: "/tools/fhss-calculator" },
            { label: "Borrowing Power Calculator", href: "/tools/borrowing-power-calculator" },
            { label: "FHB Hub", href: "/first-home-buyer" },
          ].map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="block border border-slate-200 rounded-lg p-3 text-sm text-slate-700 hover:border-violet-300 hover:bg-violet-50 transition-colors"
            >
              {t.label} →
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs text-slate-500 leading-relaxed">
        {GENERAL_ADVICE_WARNING} Stamp duty figures are progressive in
        practice — this calculator uses a single mid-band rate to give a
        planning estimate. Always confirm the exact amount against your
        state revenue office before settlement.
      </p>
    </main>
  );
}

function ResultCard({
  label,
  value,
  highlight = false,
  positive,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
        {label}
      </p>
      <p
        className={`text-xl font-extrabold ${
          positive === true
            ? "text-emerald-700"
            : highlight
              ? "text-violet-900"
              : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
