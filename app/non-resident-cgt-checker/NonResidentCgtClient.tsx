"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * Non-resident CGT exemption checker
 * ----------------------------------
 * Interactive decision tree for Section 855-10 ITAA 1997 eligibility.
 *
 * Section 855-10 generally exempts non-residents from Australian
 * CGT on disposals of assets that are NOT Taxable Australian
 * Property (TAP). This tool walks the common TAP categories:
 *   - Direct / indirect interests in Australian real property
 *   - Business assets of an Australian permanent establishment
 *   - >=10% interests in land-rich Australian companies
 *
 * The exemption is the biggest structural advantage Australia offers
 * portfolio non-resident investors and is routinely misunderstood.
 *
 * Verdicts are educational, not legal advice. For non-trivial assets
 * the user should see a foreign-investment lawyer or cross-border
 * tax advisor.
 */

type AssetType =
  | "listed_shares"
  | "etf_units"
  | "direct_mining_interest"
  | "real_property"
  | "business_assets"
  | "land_rich_company";

type StakePct = "<10" | ">=10";

interface Step {
  id: string;
  title: string;
}

const STEPS: Step[] = [
  { id: "asset", title: "What are you selling?" },
  { id: "stake", title: "How much do you hold?" },
  { id: "result", title: "Result" },
];

const ASSET_LABELS: Record<AssetType, string> = {
  listed_shares: "Listed Australian shares (ASX)",
  etf_units: "ASX-listed ETF units",
  direct_mining_interest: "Direct mining tenement / petroleum interest",
  real_property: "Australian real property (residential / commercial / farmland)",
  business_assets: "Assets of an Australian business / permanent establishment",
  land_rich_company:
    "Unlisted shares in an Australian company where >50% of value is Australian real property",
};

export default function NonResidentCgtClient() {
  const [step, setStep] = useState(0);
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [stake, setStake] = useState<StakePct | null>(null);

  function reset() {
    setStep(0);
    setAssetType(null);
    setStake(null);
  }

  function evaluate() {
    if (!assetType) return null;

    // Real property and direct mining interests are always TAP
    if (assetType === "real_property") {
      return {
        verdict: "TAXABLE" as const,
        title: "Australian CGT applies",
        reason:
          "Direct interests in Australian real property (residential, commercial, or agricultural land) are Taxable Australian Property under Section 855-20. Section 855-10 does not apply. Any capital gain is subject to Australian CGT at the non-resident rate schedule (no 50% discount for non-residents on post-May-2012 gains).",
        advisors: ["commercial_lawyer", "foreign_investment_lawyer", "tax_agent"],
      };
    }

    if (assetType === "direct_mining_interest") {
      return {
        verdict: "TAXABLE" as const,
        title: "Australian CGT applies",
        reason:
          "Direct interests in Australian mining tenements, petroleum production licences, and associated real property are Taxable Australian Property. The Section 855-10 portfolio exemption does not apply regardless of holding size. FIRB approval is also typically required.",
        advisors: ["mining_lawyer", "foreign_investment_lawyer", "mining_tax_advisor"],
      };
    }

    if (assetType === "business_assets") {
      return {
        verdict: "TAXABLE" as const,
        title: "Likely taxable in Australia",
        reason:
          "Assets used in carrying on a business through an Australian permanent establishment are Taxable Australian Property. The test looks at where the business is conducted, not where the entity is incorporated. You should engage a cross-border tax advisor to analyse the specific facts.",
        advisors: ["commercial_lawyer", "tax_agent"],
      };
    }

    if (assetType === "land_rich_company") {
      // Stake matters for land-rich test
      if (stake === ">=10") {
        return {
          verdict: "TAXABLE" as const,
          title: "Australian CGT applies",
          reason:
            "An interest of 10% or more in an Australian company whose value is principally (>50%) derived from Australian real property is an Indirect Australian Real Property Interest. Section 855-25 applies — CGT is owed on disposal regardless of the Section 855-10 portfolio exemption.",
          advisors: ["commercial_lawyer", "tax_agent"],
        };
      }
      return {
        verdict: "EXEMPT" as const,
        title: "Section 855-10 exemption likely applies",
        reason:
          "For holdings below 10% in a land-rich Australian company, Section 855-10 generally applies and Australian CGT is not owed on disposal. Verify the 10% threshold across the five-year period (the '10% associate-inclusive' test) before relying on this result.",
        advisors: ["tax_agent"],
      };
    }

    // Listed shares, ETF units: portfolio test
    if (stake === ">=10") {
      return {
        verdict: "TAXABLE_MAYBE" as const,
        title: "Portfolio exemption does NOT apply",
        reason:
          "Holdings of 10% or more in an Australian company (or its indirect equivalents) fall outside the Section 855-10 portfolio exemption. Whether Australian CGT is owed depends on other tests — principally whether the company is land-rich. For a listed ASX company that is not land-rich (e.g. a bank, industrial, or typical mining producer), CGT may still not apply. You should engage a cross-border tax advisor before assuming either outcome.",
        advisors: ["tax_agent", "foreign_investment_lawyer"],
      };
    }

    return {
      verdict: "EXEMPT" as const,
      title: "Section 855-10 exemption applies",
      reason:
        "Non-resident holders of less than 10% of an ASX-listed company (or ETF units in a listed Australian ETF) are generally exempt from Australian CGT on disposal under Section 855-10 ITAA 1997. This is the most investor-friendly feature of the Australian tax regime for non-resident portfolio investors.",
      advisors: ["tax_agent"],
    };
  }

  const result = step === 2 ? evaluate() : null;

  return (
    <div className="bg-white min-h-screen">
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
              Non-Resident CGT Checker
            </span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full text-xs font-semibold text-blue-800 mb-4">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            Section 855-10 ITAA 1997
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
            Non-Resident CGT Exemption Checker
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            A three-question check for whether the Australian CGT portfolio
            exemption applies to your disposal. Educational tool — for
            high-value or complex situations, consult a cross-border tax
            advisor.
          </p>
        </div>
      </section>

      <section className="py-10 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-6">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex-1 flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    i <= step
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {i + 1}
                </div>
                <span className="ml-2 text-xs font-semibold text-slate-700 hidden sm:inline">
                  {s.title}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 ${
                      i < step ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
            {/* Step 1 */}
            {step === 0 && (
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                  What are you selling?
                </h2>
                <div className="space-y-2">
                  {(Object.keys(ASSET_LABELS) as AssetType[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        setAssetType(k);
                        setStep(1);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        assetType === k
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-900">
                        {ASSET_LABELS[k]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 1 && (
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 mb-1">
                  What is your (and your associates&apos;) holding?
                </h2>
                <p className="text-sm text-slate-600 mb-4">
                  For the portfolio exemption, the 10% test counts your
                  holding{" "}
                  <em>plus</em> the holdings of associates (broadly: close
                  relatives, controlled entities, and trusts) aggregated across
                  the last five years.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setStake("<10");
                      setStep(2);
                    }}
                    className={`px-4 py-4 rounded-lg border-2 transition-colors text-left ${
                      stake === "<10"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <p className="font-bold text-slate-900 mb-1">
                      Less than 10%
                    </p>
                    <p className="text-xs text-slate-600">
                      Typical portfolio / retail holding
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setStake(">=10");
                      setStep(2);
                    }}
                    className={`px-4 py-4 rounded-lg border-2 transition-colors text-left ${
                      stake === ">=10"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <p className="font-bold text-slate-900 mb-1">
                      10% or more
                    </p>
                    <p className="text-xs text-slate-600">
                      Substantial / strategic holding
                    </p>
                  </button>
                </div>
                <button
                  onClick={() => setStep(0)}
                  className="mt-4 text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
                >
                  <Icon name="arrow-left" size={14} /> Change asset type
                </button>
              </div>
            )}

            {/* Step 3 — result */}
            {step === 2 && result && (
              <div>
                <div
                  className={`rounded-xl border p-5 mb-5 ${
                    result.verdict === "EXEMPT"
                      ? "bg-emerald-50 border-emerald-200"
                      : result.verdict === "TAXABLE"
                        ? "bg-rose-50 border-rose-200"
                        : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <p
                    className={`text-xs font-extrabold uppercase tracking-wide mb-1 ${
                      result.verdict === "EXEMPT"
                        ? "text-emerald-800"
                        : result.verdict === "TAXABLE"
                          ? "text-rose-800"
                          : "text-amber-800"
                    }`}
                  >
                    {result.verdict === "EXEMPT"
                      ? "Likely EXEMPT"
                      : result.verdict === "TAXABLE"
                        ? "Australian CGT LIKELY OWED"
                        : "Depends — specialist review needed"}
                  </p>
                  <h3
                    className={`text-xl font-extrabold mb-2 ${
                      result.verdict === "EXEMPT"
                        ? "text-emerald-900"
                        : result.verdict === "TAXABLE"
                          ? "text-rose-900"
                          : "text-amber-900"
                    }`}
                  >
                    {result.title}
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {result.reason}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
                    Inputs
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>Asset:</strong>{" "}
                    {assetType ? ASSET_LABELS[assetType] : "—"}
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>Holding:</strong>{" "}
                    {stake === "<10"
                      ? "Less than 10%"
                      : stake === ">=10"
                        ? "10% or more"
                        : "n/a"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/advisors/foreign-investment-lawyers"
                    className="inline-flex items-center gap-1.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors"
                  >
                    Find a foreign-investment lawyer
                    <Icon name="arrow-right" size={14} />
                  </Link>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                  >
                    <Icon name="refresh-cw" size={14} /> Start over
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Context */}
      <section className="py-10 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            What Section 855-10 actually says
          </h2>
          <div className="prose prose-slate max-w-none text-sm md:text-base">
            <p>
              Section 855-10 of the Income Tax Assessment Act 1997 disregards
              capital gains and losses made by a non-resident on CGT events
              happening to an asset that is not Taxable Australian Property
              (TAP). The TAP categories in Section 855-15 are:
            </p>
            <ul>
              <li>
                Taxable Australian Real Property (855-20) — direct interests in
                Australian real property.
              </li>
              <li>
                Indirect Australian Real Property Interests (855-25) — shares
                in entities principally invested in Australian real property,
                where you hold at least 10%.
              </li>
              <li>
                Business assets used through an Australian permanent
                establishment (855-30).
              </li>
              <li>
                An option or right to acquire any of the above.
              </li>
            </ul>
            <p>
              Listed ASX shares and ETF units, outside of the land-rich or
              substantial-holding tests, fall outside all four TAP categories
              and are therefore exempt from Australian CGT for non-residents.
              This is the structural advantage that makes Australian listed
              equities attractive to foreign portfolio investors.
            </p>

            <p className="text-xs text-slate-500 italic mt-4">
              This tool is educational, not legal or tax advice. It does not
              consider anti-avoidance provisions, partial-year residency, or
              non-DTA country positions. For non-trivial dispositions consult a
              registered tax agent and a foreign-investment lawyer.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/foreign-investment/shares"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              Non-resident shares guide
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/non-resident-dividend-calculator"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              Non-resident dividend calculator
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/firb-fee-estimator"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              FIRB fee estimator
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
