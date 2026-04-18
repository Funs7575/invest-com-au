"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * FIRB fee estimator
 * ------------------
 * Indicative application-fee calculator based on the Treasury FIRB
 * fee schedule in force through 2025-26.
 *
 * This is a simplified tiered lookup — the real schedule has dozens
 * of cells across asset class, investor status and transaction
 * value. We expose the four highest-traffic asset classes and the
 * two investor statuses that most consultations involve. All other
 * combinations defer to the "sensitive sector / other" track, which
 * uses the commercial-land-above-threshold fee band as a sensible
 * floor.
 *
 * Source: https://firb.gov.au — fees are indicative and rounded.
 * Always confirm against the current published schedule before
 * lodging an application.
 */

type AssetClass =
  | "residential"
  | "commercial_developed"
  | "commercial_vacant"
  | "agricultural"
  | "business"
  | "mining_tenement"
  | "energy_critical_infrastructure";

type InvestorType = "private" | "foreign_government";

interface FeeTier {
  maxValue: number; // cents
  fee: number; // cents
}

// Fees in AUD cents so we can compute and display cleanly without
// floating-point error. Tiers are bands: transaction value <= maxValue
// triggers this fee. A top tier has maxValue = Infinity.
const FEE_SCHEDULES: Record<AssetClass, FeeTier[]> = {
  // Residential (established/new dwelling, vacant residential)
  residential: [
    { maxValue: 75_000_000_00, fee: 14_700_00 },      // <= $75K: $14,700
    { maxValue: 1_000_000_00_00, fee: 29_400_00 },    // <= $1M: $29,400
    { maxValue: 2_000_000_00_00, fee: 58_800_00 },    // <= $2M: $58,800
    { maxValue: 3_000_000_00_00, fee: 117_600_00 },   // <= $3M: $117,600
    { maxValue: 5_000_000_00_00, fee: 235_200_00 },   // <= $5M: $235,200
    { maxValue: Infinity, fee: 587_900_00 },          // above: ~$587,900
  ],
  // Commercial developed (office, retail, industrial)
  commercial_developed: [
    { maxValue: 50_000_000_00, fee: 14_700_00 },
    { maxValue: 500_000_000_00, fee: 29_400_00 },
    { maxValue: 1_000_000_00_00, fee: 58_800_00 },
    { maxValue: Infinity, fee: 117_600_00 },
  ],
  // Commercial vacant land
  commercial_vacant: [
    { maxValue: 50_000_000_00, fee: 14_700_00 },
    { maxValue: 500_000_000_00, fee: 29_400_00 },
    { maxValue: Infinity, fee: 58_800_00 },
  ],
  // Agricultural land
  agricultural: [
    { maxValue: 15_000_000_00, fee: 14_700_00 },
    { maxValue: 50_000_000_00, fee: 29_400_00 },
    { maxValue: Infinity, fee: 58_800_00 },
  ],
  // Business acquisition / entity take-over
  business: [
    { maxValue: 50_000_000_00, fee: 29_400_00 },
    { maxValue: 500_000_000_00, fee: 117_600_00 },
    { maxValue: 1_000_000_00_00, fee: 235_200_00 },
    { maxValue: Infinity, fee: 587_900_00 },
  ],
  // Mining tenement (sensitive sector — always notifiable)
  mining_tenement: [
    { maxValue: 50_000_000_00, fee: 29_400_00 },
    { maxValue: 500_000_000_00, fee: 117_600_00 },
    { maxValue: Infinity, fee: 235_200_00 },
  ],
  // Energy / critical infrastructure (LNG, refinery, pipeline, storage)
  energy_critical_infrastructure: [
    { maxValue: 50_000_000_00, fee: 29_400_00 },
    { maxValue: 500_000_000_00, fee: 117_600_00 },
    { maxValue: 1_000_000_00_00, fee: 235_200_00 },
    { maxValue: Infinity, fee: 587_900_00 },
  ],
};

const ASSET_LABELS: Record<AssetClass, string> = {
  residential: "Residential real estate",
  commercial_developed: "Commercial developed land",
  commercial_vacant: "Commercial vacant land",
  agricultural: "Agricultural land",
  business: "Business / entity acquisition",
  mining_tenement: "Mining tenement (sensitive sector)",
  energy_critical_infrastructure:
    "Energy / critical infrastructure (LNG, refinery, pipeline, storage)",
};

const INVESTOR_LABELS: Record<InvestorType, string> = {
  private: "Private (non-government)",
  foreign_government: "Foreign government investor",
};

function lookupFeeCents(
  assetClass: AssetClass,
  valueCents: number,
  investorType: InvestorType,
): number {
  const schedule = FEE_SCHEDULES[assetClass];
  let baseFee = schedule[schedule.length - 1]!.fee;
  for (const tier of schedule) {
    if (valueCents <= tier.maxValue) {
      baseFee = tier.fee;
      break;
    }
  }
  // Foreign government investors pay the same lodgement fee but frequently
  // face additional reviewable fees under the national-security regime.
  // We expose a 50% uplift as an indicative placeholder to remind the user
  // FGI cases are more expensive end-to-end.
  return investorType === "foreign_government"
    ? Math.round(baseFee * 1.5)
    : baseFee;
}

function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export default function FirbFeeEstimatorClient() {
  const [assetClass, setAssetClass] = useState<AssetClass>(
    "energy_critical_infrastructure",
  );
  const [investorType, setInvestorType] = useState<InvestorType>("private");
  const [valueAud, setValueAud] = useState<string>("10000000");

  const valueCents = useMemo(() => {
    const n = parseFloat(valueAud) || 0;
    return Math.max(0, Math.round(n * 100));
  }, [valueAud]);

  const feeCents = useMemo(
    () => lookupFeeCents(assetClass, valueCents, investorType),
    [assetClass, valueCents, investorType],
  );

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-3xl">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">
              Foreign Investment
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">
              FIRB Fee Estimator
            </span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full text-xs font-semibold text-amber-800 mb-4">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            Indicative estimate · Treasury fee schedule
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
            FIRB Application Fee Estimator
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            Estimate the Australian Foreign Investment Review Board application
            fee for a foreign acquisition. Covers residential, commercial,
            agricultural, business, mining, and energy / critical-infrastructure
            asset classes.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-10 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-5">
            <div>
              <label
                htmlFor="asset-class"
                className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
              >
                Asset class
              </label>
              <select
                id="asset-class"
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {(Object.keys(ASSET_LABELS) as AssetClass[]).map((k) => (
                  <option key={k} value={k}>
                    {ASSET_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="investor-type"
                className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
              >
                Investor type
              </label>
              <select
                id="investor-type"
                value={investorType}
                onChange={(e) =>
                  setInvestorType(e.target.value as InvestorType)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {(Object.keys(INVESTOR_LABELS) as InvestorType[]).map((k) => (
                  <option key={k} value={k}>
                    {INVESTOR_LABELS[k]}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Foreign government investors (including sovereign wealth funds
                and state-owned enterprises) face additional review. We apply a
                1.5x uplift as an indicative placeholder for the higher
                end-to-end cost.
              </p>
            </div>

            <div>
              <label
                htmlFor="value-aud"
                className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
              >
                Transaction value (AUD)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">$</span>
                <input
                  id="value-aud"
                  type="number"
                  value={valueAud}
                  onChange={(e) => setValueAud(e.target.value)}
                  min={0}
                  step={100000}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Enter the gross consideration in Australian dollars.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-1">
                Estimated application fee
              </p>
              <p className="text-3xl md:text-4xl font-extrabold text-amber-900">
                {formatCents(feeCents)}
              </p>
              <p className="text-xs text-amber-800 mt-2 leading-relaxed">
                For {ASSET_LABELS[assetClass].toLowerCase()} at{" "}
                {formatCents(valueCents)} by a {INVESTOR_LABELS[investorType].toLowerCase()}.
                Legal fees for preparing the application are additional,
                typically A$45,000-A$150,000 for standard matters or
                A$150,000-A$300,000 for sensitive-sector energy / uranium
                transactions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-10 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            How the FIRB fee schedule works
          </h2>
          <div className="prose prose-slate max-w-none text-sm md:text-base">
            <p>
              The Australian Treasury publishes a fee schedule under the Foreign
              Acquisitions and Takeovers Fees Imposition Act 2015. The fee you
              pay depends on three things:
            </p>
            <ol>
              <li>
                <strong>Asset class.</strong> Residential, commercial,
                agricultural, business, and sensitive-sector (mining, energy,
                critical infrastructure) all have different tiers.
              </li>
              <li>
                <strong>Transaction value.</strong> Fees scale in bands — low
                value transactions pay a minimum fee, higher-value transactions
                pay more.
              </li>
              <li>
                <strong>Investor type.</strong> Private investors pay the base
                fee; foreign government investors frequently trigger additional
                national-security review.
              </li>
            </ol>
            <p>
              Fees are indexed annually on 1 July. This estimator is a{" "}
              <strong>simplified representation</strong> of the public fee
              schedule and is intended to give a rough budget for planning. For
              a specific transaction, always:
            </p>
            <ol>
              <li>
                Check the current schedule at{" "}
                <a
                  href="https://firb.gov.au/guidance-resources/fees"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:underline"
                >
                  firb.gov.au
                </a>
                .
              </li>
              <li>
                Engage a foreign investment lawyer for the application — legal
                fees are typically larger than the FIRB application fee itself.
              </li>
              <li>
                Budget 90-180 days for straightforward transactions; sensitive
                sector or foreign-government transactions can take 6-12 months.
              </li>
            </ol>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/foreign-investment/energy"
              className="inline-flex items-center gap-1.5 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              Read the energy foreign-investment guide
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/advisors/foreign-investment-lawyers"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              Find a foreign investment lawyer
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/non-resident-dividend-calculator"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              Non-resident dividend calculator
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
