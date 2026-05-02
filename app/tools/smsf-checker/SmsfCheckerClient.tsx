"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

type AssetClass =
  | "residential-property"
  | "commercial-property"
  | "business-real-property"
  | "direct-shares"
  | "managed-fund"
  | "collectibles"
  | "cryptocurrency";

type YesNoUnsure = "yes" | "no" | "unsure";
type YesNoNa = "yes" | "no" | "na";

interface Answers {
  asset: AssetClass | null;
  fromRelatedParty: YesNoUnsure | null;
  personalUse: YesNoUnsure | null;
  insuredInFundName: YesNoNa | null;
  storedAtMemberPremises: YesNoNa | null;
  documentedInStrategy: YesNoUnsure | null;
  usingLrba: "yes" | "no" | null;
}

interface AssetOption {
  key: AssetClass;
  label: string;
  hint: string;
}

const ASSET_OPTIONS: AssetOption[] = [
  {
    key: "residential-property",
    label: "Residential property",
    hint: "Standalone houses, units or apartments not used for business.",
  },
  {
    key: "commercial-property",
    label: "Commercial property",
    hint: "Office, retail or industrial property held purely as investment.",
  },
  {
    key: "business-real-property",
    label: "Business real property",
    hint: "Real estate used wholly and exclusively in one or more businesses (your own business included).",
  },
  {
    key: "direct-shares",
    label: "Direct shares (ASX or international listed)",
    hint: "Listed equities on an approved exchange.",
  },
  {
    key: "managed-fund",
    label: "Managed fund / ETF",
    hint: "Registered managed investment schemes and exchange-traded funds.",
  },
  {
    key: "collectibles",
    label: "Collectables (art, cars, wine, watches, jewellery, coins)",
    hint: "Personal-use assets covered by SISA s62A and SIS Reg 13.18AA.",
  },
  {
    key: "cryptocurrency",
    label: "Cryptocurrency",
    hint: "Direct holdings of digital assets via an SMSF-named exchange wallet.",
  },
];

type Verdict = "Eligible" | "Conditional" | "Ineligible" | "Specialist required";

interface VerdictResult {
  verdict: Verdict;
  reasons: string[];
  advisorSlug: "smsf-specialists" | "smsf-accountants";
}

function evaluate(answers: Answers): VerdictResult | null {
  if (!answers.asset) return null;

  const reasons: string[] = [];
  let blocked = false;
  let conditional = false;
  let needsSpecialist = false;

  const isCollectible = answers.asset === "collectibles";
  const isShares = answers.asset === "direct-shares" || answers.asset === "managed-fund";
  const isBusinessRealProperty = answers.asset === "business-real-property";
  const isResidential = answers.asset === "residential-property";
  const isCrypto = answers.asset === "cryptocurrency";

  if (answers.fromRelatedParty === "yes") {
    if (isShares || isBusinessRealProperty) {
      reasons.push(
        "Acquisition from a related party is permitted for listed shares or business real property at market value (SISA s66(2A)). Document the acquisition with an independent market valuation.",
      );
      conditional = true;
    } else {
      reasons.push(
        "SISA s66 prohibits acquiring this asset from a related party. The narrow exceptions are listed shares acquired at market value and business real property — your selected asset class is neither.",
      );
      blocked = true;
    }
  } else if (answers.fromRelatedParty === "unsure") {
    needsSpecialist = true;
    reasons.push(
      "You're unsure whether the seller is a related party. SISA defines this broadly (members, relatives, related entities). Get this confirmed before proceeding — an SMSF specialist accountant can review the chain of ownership.",
    );
  }

  if (isCollectible) {
    if (answers.personalUse === "yes" || answers.storedAtMemberPremises === "yes") {
      reasons.push(
        "Collectables held in an SMSF cannot be used personally and cannot be stored at a member's residence (SIS Reg 13.18AA). This is a sole-purpose-test breach with civil penalties.",
      );
      blocked = true;
    }
    if (answers.insuredInFundName === "no") {
      reasons.push(
        "Collectables must be insured in the fund's name within 7 days of acquisition (SIS Reg 13.18AA(3)). Without compliant insurance the asset cannot remain in the fund.",
      );
      blocked = true;
    }
    if (answers.personalUse === "unsure") {
      needsSpecialist = true;
      reasons.push(
        "Collectables compliance turns on storage location and access. If unsure, document the arrangement with a registered SMSF auditor before lodging.",
      );
    }
  }

  if (isResidential && answers.personalUse === "yes") {
    reasons.push(
      "Residential property in an SMSF cannot be lived in or rented to members or related parties under any circumstances (SISA s71 in-house asset rules). The asset must be held purely for investment return.",
    );
    blocked = true;
  }

  if (answers.usingLrba === "yes") {
    if (isCollectible) {
      reasons.push(
        "Collectables cannot be acquired via a Limited Recourse Borrowing Arrangement — LRBAs require a single acquirable asset that is permitted under s67A. Collectables fail the personal-use sole-purpose limb.",
      );
      blocked = true;
    } else {
      reasons.push(
        "LRBAs are tightly constrained: borrowed funds cannot improve the asset (only repair / maintain), and the asset must be a single acquirable asset held in a separate bare trust. Get the structure documented by an SMSF lawyer before settlement.",
      );
      conditional = true;
    }
  }

  if (isCrypto) {
    if (answers.fromRelatedParty !== "no") {
      reasons.push(
        "Crypto held in an SMSF must be in a wallet/account in the fund's name (or trustee as trustee for the fund). Member-personal wallets transferred in are an in-house-asset breach.",
      );
      conditional = true;
    } else {
      reasons.push(
        "Crypto can be held in an SMSF if the wallet/exchange account is in the fund's name, the trustees document it in the investment strategy, and the assets are not used as security.",
      );
      conditional = true;
    }
  }

  if (answers.documentedInStrategy === "no") {
    reasons.push(
      "SISA s52B requires trustees to formulate, regularly review, and give effect to an investment strategy. Document this asset class — including risk, return, diversification, liquidity and cash flow — before acquisition. Failure is an administrative breach reportable to the ATO.",
    );
    conditional = true;
  } else if (answers.documentedInStrategy === "unsure") {
    needsSpecialist = true;
  }

  if (reasons.length === 0) {
    if (isShares || answers.asset === "managed-fund" || isBusinessRealProperty) {
      reasons.push(
        "On the answers given, this asset class can be held in an SMSF subject to ongoing compliance: sole-purpose test, arm's-length transactions, and annual auditor sign-off.",
      );
    } else {
      reasons.push(
        "On the answers given, this asset class can be held in an SMSF — but the rules are nuanced. Have your SMSF accountant confirm the structure before proceeding.",
      );
      conditional = true;
    }
  }

  let verdict: Verdict;
  if (blocked) {
    verdict = "Ineligible";
  } else if (needsSpecialist) {
    verdict = "Specialist required";
  } else if (conditional) {
    verdict = "Conditional";
  } else {
    verdict = "Eligible";
  }

  const advisorSlug: VerdictResult["advisorSlug"] =
    isCollectible || isCrypto || answers.usingLrba === "yes" || isBusinessRealProperty
      ? "smsf-specialists"
      : "smsf-accountants";

  return { verdict, reasons, advisorSlug };
}

const VERDICT_STYLES: Record<Verdict, { badge: string; card: string }> = {
  Eligible: {
    badge: "bg-emerald-100 text-emerald-800",
    card: "bg-emerald-50 border-emerald-200",
  },
  Conditional: {
    badge: "bg-amber-100 text-amber-800",
    card: "bg-amber-50 border-amber-200",
  },
  Ineligible: {
    badge: "bg-rose-100 text-rose-800",
    card: "bg-rose-50 border-rose-200",
  },
  "Specialist required": {
    badge: "bg-sky-100 text-sky-800",
    card: "bg-sky-50 border-sky-200",
  },
};

function RadioGroup({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string | null;
  options: { key: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
              active
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
            }`}
            aria-pressed={active}
            aria-label={`${name}: ${opt.label}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function SmsfCheckerClient() {
  const [answers, setAnswers] = useState<Answers>({
    asset: null,
    fromRelatedParty: null,
    personalUse: null,
    insuredInFundName: null,
    storedAtMemberPremises: null,
    documentedInStrategy: null,
    usingLrba: null,
  });

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const result = useMemo(() => evaluate(answers), [answers]);

  const isCollectible = answers.asset === "collectibles";

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-3xl">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/tools" className="hover:text-slate-900">Tools</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">SMSF Eligibility Checker</span>
          </nav>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight mb-3 tracking-tight text-slate-900">
            SMSF Eligibility Checker
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            Self-managed super funds are powerful — and unforgiving. This
            stepped checker covers the main SISA constraints on what can sit
            inside an SMSF: collectables rules, related-party acquisitions,
            LRBAs, and the sole-purpose test. Answer each step honestly to
            get a verdict.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-5">
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>General information only — not personal advice.</strong>
              {" "}This tool is a screening aid. SMSF compliance breaches carry
              civil penalties, loss of complying-fund status (15% tax becomes
              45% non-arm&apos;s-length tax), and potential disqualification
              of trustees. Always confirm with a registered SMSF auditor or an
              AFSL-licensed adviser before lodging.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
              Step 1 of 7
            </p>
            <h2 className="text-base font-extrabold text-slate-900 mb-3">
              What asset class is this for?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ASSET_OPTIONS.map((opt) => {
                const active = answers.asset === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => set("asset", opt.key)}
                    className={`text-left border rounded-lg p-3 transition-colors ${
                      active
                        ? "border-slate-900 bg-white ring-2 ring-slate-300"
                        : "border-slate-200 bg-white hover:border-slate-400"
                    }`}
                    aria-pressed={active}
                  >
                    <p className="text-sm font-bold text-slate-900">{opt.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {answers.asset && (
            <>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Step 2 of 7
                </p>
                <h2 className="text-base font-extrabold text-slate-900 mb-1">
                  Is the asset acquired from a related party?
                </h2>
                <p className="text-[11px] text-slate-500 mb-3">
                  Related parties include members, relatives (parents, spouse,
                  children, siblings), and entities the members control.
                </p>
                <RadioGroup
                  name="fromRelatedParty"
                  value={answers.fromRelatedParty}
                  onChange={(v) => set("fromRelatedParty", v as YesNoUnsure)}
                  options={[
                    { key: "no", label: "No — arm's-length seller" },
                    { key: "yes", label: "Yes" },
                    { key: "unsure", label: "Unsure" },
                  ]}
                />
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Step 3 of 7
                </p>
                <h2 className="text-base font-extrabold text-slate-900 mb-3">
                  Will any member or related party use the asset personally?
                </h2>
                <RadioGroup
                  name="personalUse"
                  value={answers.personalUse}
                  onChange={(v) => set("personalUse", v as YesNoUnsure)}
                  options={[
                    { key: "no", label: "No — purely investment" },
                    { key: "yes", label: "Yes" },
                    { key: "unsure", label: "Unsure" },
                  ]}
                />
              </div>

              {isCollectible && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                    Step 4 of 7
                  </p>
                  <h2 className="text-base font-extrabold text-slate-900 mb-1">
                    Is the asset insured in the fund&apos;s name?
                  </h2>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Required for collectables within 7 days of acquisition
                    (SIS Reg 13.18AA(3)).
                  </p>
                  <RadioGroup
                    name="insuredInFundName"
                    value={answers.insuredInFundName}
                    onChange={(v) => set("insuredInFundName", v as YesNoNa)}
                    options={[
                      { key: "yes", label: "Yes" },
                      { key: "no", label: "No / not yet" },
                      { key: "na", label: "Not applicable" },
                    ]}
                  />
                </div>
              )}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Step {isCollectible ? "5" : "4"} of 7
                </p>
                <h2 className="text-base font-extrabold text-slate-900 mb-3">
                  Is the asset stored at a member&apos;s residence or place of business?
                </h2>
                <RadioGroup
                  name="storedAtMemberPremises"
                  value={answers.storedAtMemberPremises}
                  onChange={(v) => set("storedAtMemberPremises", v as YesNoNa)}
                  options={[
                    { key: "no", label: "No — third-party storage" },
                    { key: "yes", label: "Yes" },
                    { key: "na", label: "Not applicable" },
                  ]}
                />
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Step {isCollectible ? "6" : "5"} of 7
                </p>
                <h2 className="text-base font-extrabold text-slate-900 mb-3">
                  Has the trustee documented this in the fund&apos;s investment strategy?
                </h2>
                <RadioGroup
                  name="documentedInStrategy"
                  value={answers.documentedInStrategy}
                  onChange={(v) => set("documentedInStrategy", v as YesNoUnsure)}
                  options={[
                    { key: "yes", label: "Yes" },
                    { key: "no", label: "No / not yet" },
                    { key: "unsure", label: "Unsure" },
                  ]}
                />
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Step {isCollectible ? "7" : "6"} of 7
                </p>
                <h2 className="text-base font-extrabold text-slate-900 mb-1">
                  Are you using SMSF borrowing (LRBA) for this purchase?
                </h2>
                <p className="text-[11px] text-slate-500 mb-3">
                  Limited Recourse Borrowing Arrangement under SISA s67A.
                </p>
                <RadioGroup
                  name="usingLrba"
                  value={answers.usingLrba}
                  onChange={(v) => set("usingLrba", v as "yes" | "no")}
                  options={[
                    { key: "no", label: "No — fund cash purchase" },
                    { key: "yes", label: "Yes" },
                  ]}
                />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-10 bg-white">
        <div className="container-custom max-w-3xl">
          {!result ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-600">
                Choose an asset class above to begin.
              </p>
            </div>
          ) : (
            <article
              className={`border rounded-2xl p-6 md:p-8 ${VERDICT_STYLES[result.verdict].card}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${VERDICT_STYLES[result.verdict].badge}`}
                >
                  {result.verdict}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Verdict
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
                {result.verdict === "Eligible" &&
                  "Likely permitted — keep documenting."}
                {result.verdict === "Conditional" &&
                  "Permitted with conditions — read the reasoning carefully."}
                {result.verdict === "Ineligible" &&
                  "Not permitted as described — restructure or seek an alternative."}
                {result.verdict === "Specialist required" &&
                  "Confirmation needed — engage an SMSF specialist before proceeding."}
              </h2>
              <ul className="space-y-3 mb-6">
                {result.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <Icon
                      name="info"
                      size={14}
                      className="text-slate-500 shrink-0 mt-0.5"
                    />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                  Next step
                </p>
                <p className="text-sm text-slate-700 mb-4">
                  {result.advisorSlug === "smsf-specialists"
                    ? "This scenario benefits from an AFSL-authorised SMSF specialist (LRBA structuring, collectables, business real property)."
                    : "Have your SMSF accountant verify the documentation, valuation, and ongoing compliance footprint."}
                </p>
                <Link
                  href={`/advisors/${result.advisorSlug}`}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg"
                >
                  Find {result.advisorSlug === "smsf-specialists" ? "an SMSF specialist" : "an SMSF accountant"}
                  <Icon name="arrow-right" size={14} />
                </Link>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            <details className="bg-white border border-slate-200 rounded-xl p-4">
              <summary className="text-sm font-bold text-slate-900 cursor-pointer">
                Can I keep my Rolex in my SMSF and wear it on weekends?
              </summary>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                No. Personal use of a collectable held by an SMSF is a
                breach of SIS Reg 13.18AA. The asset must not be displayed at
                a member&apos;s residence or business and must be stored
                somewhere members do not regularly access. Penalties include
                loss of complying-fund status.
              </p>
            </details>
            <details className="bg-white border border-slate-200 rounded-xl p-4">
              <summary className="text-sm font-bold text-slate-900 cursor-pointer">
                Can I sell my own house to my SMSF?
              </summary>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Generally no. Acquiring a residential property from a related
                party is prohibited by SISA s66 — even at market value. The
                exceptions are listed shares and business real property
                (genuinely used wholly for business). A residential rental
                property held by a related entity does not qualify.
              </p>
            </details>
            <details className="bg-white border border-slate-200 rounded-xl p-4">
              <summary className="text-sm font-bold text-slate-900 cursor-pointer">
                Can my SMSF hold cryptocurrency?
              </summary>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Yes, subject to several conditions. The wallet or exchange
                account must be in the fund&apos;s name (or trustee-as-trustee).
                You cannot transfer crypto from a personal wallet — that is
                an in-house-asset breach. The investment strategy must
                document the rationale, risk, and liquidity of holding crypto.
              </p>
            </details>
            <details className="bg-white border border-slate-200 rounded-xl p-4">
              <summary className="text-sm font-bold text-slate-900 cursor-pointer">
                What is the sole-purpose test?
              </summary>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                SISA s62 requires the fund to be maintained solely for
                providing retirement (or death) benefits to members. Any
                arrangement that gives a current-day benefit to a member or
                related party — free use of property, personal enjoyment of
                a collectable, below-market loans — is a breach.
              </p>
            </details>
            <details className="bg-white border border-slate-200 rounded-xl p-4">
              <summary className="text-sm font-bold text-slate-900 cursor-pointer">
                What happens if my SMSF breaches a rule?
              </summary>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                The auditor must lodge an Auditor Contravention Report. The
                ATO can disqualify trustees, apply administrative penalties,
                make the fund non-complying (assets taxed at 45%), or treat
                certain transactions as non-arm&apos;s-length income (also
                45%). Severe and persistent breaches can result in the fund
                being wound up.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="py-10 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl text-center">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Get specialist SMSF help
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            Compare AFSL-authorised SMSF specialists and registered SMSF
            accountants who can confirm structure, prepare documentation,
            and lodge with confidence.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/advisors/smsf-specialists"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg"
            >
              SMSF specialists
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/advisors/smsf-accountants"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg"
            >
              SMSF accountants
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
