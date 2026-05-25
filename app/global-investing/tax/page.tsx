import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Tax on Foreign Investments for Australians (${CURRENT_YEAR}) — W-8BEN, FITO, CGT, US Estate Tax`,
  description: `Plain-English guide to the Australian tax treatment of foreign shares: US dividend withholding, W-8BEN, Foreign Income Tax Offset (FITO), CGT in AUD, and US estate tax. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Tax on Foreign Investments for Australians (${CURRENT_YEAR})`,
    description:
      "Understand W-8BEN, US dividend withholding, FITO, CGT on foreign shares in AUD, and US estate tax exposure for Australian investors.",
    url: `${SITE_URL}/global-investing/tax`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Tax on Foreign Investments")}&sub=${encodeURIComponent(`W-8BEN · FITO · CGT · US Estate Tax · ${CURRENT_YEAR}`)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/tax` },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tax topic cards — each section links to a deeper guide or provides
// a self-contained plain-English summary.
// ─────────────────────────────────────────────────────────────────────────────
const TAX_TOPICS = [
  {
    id: "us-dividend-withholding",
    title: "US dividend withholding tax",
    badge: "15% (with W-8BEN)",
    summary:
      "US-incorporated companies withhold tax on dividends before paying them to non-US shareholders. The default rate for anyone who hasn't filed the correct paperwork is 30%. For Australian tax residents who have lodged a W-8BEN form, the rate drops to 15% under the Australia–US Double Tax Agreement.",
  },
  {
    id: "w-8ben",
    title: "W-8BEN — the treaty benefits form",
    badge: "All US share investors",
    summary:
      "The W-8BEN is an IRS certificate that confirms you are not a US person and claims the reduced withholding rate available under the AU–US tax treaty. Without it, you pay 30% on every US dividend. Every Australian-facing US broker captures it during onboarding. It is valid for three calendar years plus the year of signing — missing a renewal flips you back to 30%.",
  },
  {
    id: "fito",
    title: "Foreign Income Tax Offset (FITO)",
    badge: "Offsets double taxation",
    summary:
      "The FITO allows Australian residents to reduce their Australian income tax by the amount of foreign tax they have already paid — up to the Australian tax payable on that same income. If you paid 15% US dividend withholding and your Australian marginal rate is 37%, your net AU tax on that dividend is approximately 22% (37% − 15% FITO). The FITO is claimed on your Australian tax return using the foreign tax figure from your broker's annual tax statement.",
  },
  {
    id: "us-estate-tax",
    title: "US estate tax — the 40% cliff",
    badge: "US$60,000 exemption",
    summary:
      "US estate tax is imposed on the value of US-situs assets owned by a non-US person at death, at rates up to 40%. The exemption for non-resident aliens is only US$60,000 — compared to around US$13.6 million for US citizens. Direct US shares (Apple, Tesla, S&P 500 stocks) are US-situs assets. Australian-listed ETFs holding US shares are generally not, because the unit itself is an Australian-domiciled security.",
  },
  {
    id: "cgt-foreign-shares",
    title: "CGT on foreign shares — calculated in AUD",
    badge: "AUD gain, not USD",
    summary:
      "Australian CGT is calculated in AUD, even when your shares are denominated in a foreign currency. Your cost base is the foreign-currency purchase price converted to AUD at the rate on the purchase date. Your proceeds are the foreign-currency sale price converted to AUD at the rate on the sale date. Currency movement alone can produce a taxable AUD gain even when the foreign-currency price didn't change.",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Detailed explainer content for each topic (rendered on this page).
// This is general information — factual summaries of how the rules work.
// Each section ends with a referral to a registered tax agent or the ATO.
// ─────────────────────────────────────────────────────────────────────────────

export default function GlobalInvestingTaxHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Tax" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the US dividend withholding tax rate for Australians?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "15% under the Australia–US Double Tax Agreement, provided you have lodged a valid W-8BEN form with your broker. Without a W-8BEN, the US applies the default 30% withholding rate to non-US persons.",
        },
      },
      {
        "@type": "Question",
        name: "What is W-8BEN and why does it matter?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "W-8BEN is an IRS form that certifies you are not a US tax person and claims reduced withholding rates under the tax treaty between the US and your country of residence. For Australian residents it reduces US dividend withholding from 30% to 15%. It is valid for 3 calendar years plus the year of signing.",
        },
      },
      {
        "@type": "Question",
        name: "How does the Foreign Income Tax Offset (FITO) work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The FITO allows Australian residents to offset Australian income tax by the amount of foreign tax already paid on the same income, up to the Australian tax on that income. For example, if 15% was withheld in the US on a dividend and your Australian marginal rate is 37%, you can claim the 15% as an offset, leaving approximately 22% Australian tax payable on that dividend. This prevents double taxation.",
        },
      },
      {
        "@type": "Question",
        name: "Are Australians subject to US estate tax?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Non-US persons (including Australian residents) are subject to US estate tax on US-situs assets exceeding US$60,000 at death, at rates up to 40%. US-situs assets include direct shares of US-incorporated companies. Australian-listed ETFs that hold US shares are generally not US-situs assets because the ETF unit itself is Australian-domiciled.",
        },
      },
      {
        "@type": "Question",
        name: "How do I calculate CGT on foreign shares in Australia?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Australian CGT on foreign shares is calculated in AUD. Your cost base is the AUD value of the foreign-currency purchase price on the acquisition date (plus brokerage and FX costs). Your proceeds are the AUD value of the foreign-currency sale price on the disposal date (less brokerage). The AUD gain is subject to the standard CGT discount (50% for individuals holding over 12 months). Currency movements between purchase and sale affect the AUD gain even if the foreign-currency price was unchanged.",
        },
      },
    ],
  };

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── LEAN-LANE general-info banner ────────────────────────────── */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="container-custom py-3">
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-bold">General information only</span> — this page explains how the
            rules generally work for Australian tax residents. It is not tax advice and does not take into
            account your personal circumstances. See a registered tax agent for advice specific to your situation.
          </p>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Tax</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Tax Sub-Hub · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Tax on foreign investments{" "}
              <span className="text-amber-600">for Australians</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Plain-English general information on how the Australian tax system treats foreign shares in {CURRENT_YEAR}:
              US dividend withholding, W-8BEN, the Foreign Income Tax Offset (FITO), CGT calculated in AUD,
              and US estate-tax exposure. For advice specific to your situation, speak with a registered tax agent.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="#us-dividend-withholding" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs transition-colors">US dividend WHT &rarr;</Link>
              <Link href="#w-8ben" className="px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors">W-8BEN &rarr;</Link>
              <Link href="#fito" className="px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors">FITO &rarr;</Link>
              <Link href="#us-estate-tax" className="px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors">US estate tax &rarr;</Link>
              <Link href="#cgt-foreign-shares" className="px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors">CGT on foreign shares &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Topic card strip ─────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {TAX_TOPICS.map((t) => (
              <Link
                key={t.id}
                href={`#${t.id}`}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-amber-300 transition-colors"
              >
                <p className="text-xs font-bold text-amber-700 mb-1">{t.badge}</p>
                <p className="text-sm font-extrabold text-slate-900">{t.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION: US dividend withholding                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="us-dividend-withholding" className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="General information"
            title="US dividend withholding tax — how it works for Australians"
            sub="This is general information on how the rules work. It is not tax advice."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              When a US company pays a dividend to a non-US shareholder, the US tax system requires the
              company (or its paying agent) to withhold a percentage of the dividend before it reaches
              the investor. The withholding is remitted to the IRS on your behalf — it is not voluntary
              and you cannot opt out.
            </p>
            <p>
              <span className="font-semibold text-slate-800">Default rate (no treaty form on file):</span>{" "}
              30%. The US imposes this rate on dividends paid to non-resident aliens who have not claimed
              treaty benefits. For an Australian investor who hasn&apos;t submitted a W-8BEN, 30% of every
              US dividend is withheld before the cash reaches their account.
            </p>
            <p>
              <span className="font-semibold text-slate-800">Treaty rate (W-8BEN on file):</span>{" "}
              15%. Under Article 10 of the Australia–United States Double Tax Agreement (DTA), the
              withholding rate on dividends paid to Australian tax residents is limited to 15%, provided
              the investor has certified their Australian residence by lodging a valid W-8BEN with their broker.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
              <p className="text-xs font-bold text-amber-800 mb-2">Worked example (general illustration)</p>
              <p className="text-xs text-amber-900 leading-relaxed">
                You receive a US$1,000 gross dividend from a US share holding.<br />
                With W-8BEN (15% WHT): US$150 withheld &rarr; US$850 reaches your account.<br />
                Without W-8BEN (30% WHT): US$300 withheld &rarr; US$700 reaches your account.<br />
                The 15% gap (US$150 on this example) is generally not recoverable from the ATO once withheld at the higher rate —
                the Foreign Income Tax Offset is capped at the treaty rate. Submitting your W-8BEN on time matters.
              </p>
            </div>
            <p className="text-xs text-slate-500 italic">
              This is general information only. For your specific situation — including tax entity type
              (SMSF, trust, company), residency status, and treaty eligibility — consult a registered tax agent.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION: W-8BEN                                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="w-8ben" className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="General information"
            title="W-8BEN — certificate of foreign status"
            sub="This is general information on how the rules work. It is not tax advice."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              The W-8BEN (Certificate of Foreign Status of Beneficial Owner for United States Tax
              Withholding and Reporting) is an IRS form that you complete and provide to your US-share
              broker. By signing it, you certify that you are not a US person and that you are
              entitled to claim the reduced withholding rate available under the tax treaty between
              the US and your country of residence — Australia.
            </p>
            <p>
              <span className="font-semibold text-slate-800">Who needs to complete it?</span> Any
              Australian tax resident who holds, or intends to hold, shares in US-incorporated companies
              (directly) in a brokerage account. If you hold US shares via an Australian-listed ETF
              (IVV, NDQ, VTS), the ETF manager handles withholding at the fund level and you do not
              personally complete a W-8BEN.
            </p>
            <p>
              <span className="font-semibold text-slate-800">How long is it valid?</span> Three
              calendar years plus the year of signing. A form signed in June 2026 expires at the
              end of 2029. Reputable brokers automatically send a renewal prompt before the form
              lapses. If you miss the renewal, the broker reverts to the 30% default withholding
              rate on subsequent dividends until you re-certify.
            </p>
            <p>
              <span className="font-semibold text-slate-800">What about SMSFs?</span> An SMSF uses
              the W-8BEN-E form (the entity version, not the individual form). The fund itself certifies
              its Australian residence and its entitlement to treaty benefits. The broker&apos;s onboarding
              team should guide you through the correct form for an SMSF account.
            </p>
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-700 mb-1">Where to lodge it</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                You do not lodge the W-8BEN with the ATO or the IRS directly. You provide it to
                your broker as part of your account documentation. Every major Australian-facing US
                share broker (IBKR, Stake, Tiger, moomoo, CommSec International, CMC, Pearler, Webull,
                eToro, Vested) captures this form electronically during account opening.
              </p>
            </div>
            <p className="text-xs text-slate-500 italic">
              This is general information only. Your eligibility for treaty benefits, your entity type,
              and your residency status all affect how the rules apply. Consult a registered tax agent
              for advice specific to your situation.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION: FITO                                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="fito" className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="General information"
            title="Foreign Income Tax Offset (FITO)"
            sub="This is general information on how the rules work. It is not tax advice."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              The Foreign Income Tax Offset (FITO) is an Australian tax mechanism designed to reduce
              double taxation on foreign income. It allows Australian tax residents to offset their
              Australian income tax by the amount of foreign tax they have already paid on the same
              income — but only up to the Australian tax payable on that income.
            </p>
            <p>
              <span className="font-semibold text-slate-800">How it generally works for US dividends:</span>{" "}
              If you received a US dividend and had 15% withheld by the US payer (under the AU–US DTA
              with a valid W-8BEN), you include the gross dividend as foreign income in your Australian
              tax return and claim the 15% as a FITO. The offset reduces your AU income tax on that
              dividend by 15 percentage points, so your net AU tax is approximately (your marginal rate
              minus 15%).
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-800 mb-2">Illustrative example (general information)</p>
              <ul className="text-xs text-amber-900 space-y-1 leading-relaxed">
                <li>Gross US dividend: A$1,000 equivalent</li>
                <li>US WHT withheld at 15%: A$150</li>
                <li>Net dividend received: A$850</li>
                <li>Australian marginal rate (illustrative): 37%</li>
                <li>Australian tax on A$1,000 at 37% (before FITO): A$370</li>
                <li>FITO claimed (15% already paid): A$150</li>
                <li>Net Australian tax payable: approximately A$220</li>
                <li>Total effective rate on gross dividend: approximately 37%</li>
              </ul>
            </div>
            <p>
              <span className="font-semibold text-slate-800">The FITO cap:</span> The FITO cannot
              reduce your Australian tax below zero. If the foreign tax rate exceeds your Australian
              marginal rate (e.g. India&apos;s 20% WHT where your marginal rate is 19%), the excess
              withholding above what Australia taxes is generally not refundable. This is one reason
              high-WHT countries like India can create a material tax drag for lower-bracket Australian investors.
            </p>
            <p>
              <span className="font-semibold text-slate-800">Source documents:</span> Your broker&apos;s
              annual tax statement will typically include a breakdown of foreign income and foreign tax
              withheld — this is the figure you enter in your tax return to support the FITO claim.
            </p>
            <p className="text-xs text-slate-500 italic">
              This is general information only. FITO eligibility, calculation method, and interaction
              with other offsets and deductions can be complex. Consult a registered tax agent for
              advice specific to your situation.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION: US estate tax                                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="us-estate-tax" className="py-10 md:py-14 bg-amber-50 border-y border-amber-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="General information — important risk"
            title="US estate tax — up to 40% above US$60,000"
            sub="This is general information on how the rules work. It is not tax advice."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              US estate tax is a risk that many Australian investors are not aware of. The United
              States imposes estate tax on the value of US-situs assets owned by a non-resident alien
              (NRA) at the time of death — and the exemption for NRAs is only US$60,000.
            </p>
            <p>
              <span className="font-semibold text-slate-800">How does this affect Australians?</span>{" "}
              An Australian resident who owns direct shares of US-incorporated companies — Apple,
              Microsoft, Tesla, any S&amp;P 500 company listed on a US exchange — owns US-situs assets.
              If the total value of those US-situs assets exceeds US$60,000 at death, the excess
              (above the US$60,000 exemption) may be subject to US estate tax at rates of up to 40%.
              This applies regardless of which broker account those shares are held in.
            </p>
            <p>
              <span className="font-semibold text-slate-800">What is a US-situs asset?</span> Generally:
              shares in US-incorporated companies, debt instruments issued by US entities, and real
              property located in the US. The situs of an asset determines which country has the
              right to tax it on death under US law.
            </p>
            <p>
              <span className="font-semibold text-slate-800">What is NOT a US-situs asset?</span>{" "}
              Australian-listed ETFs that hold US shares — for example, IVV (iShares S&amp;P 500 ETF
              listed on ASX), NDQ (Betashares NASDAQ 100 ETF), or VTS (Vanguard US Total Market ETF).
              The unit in these funds is a security issued by an Australian-domiciled trust or company.
              The underlying assets are American, but the ETF unit itself is not US-situs from the
              US estate-tax perspective. This distinction is one of the material structural advantages
              of using AU-listed ETFs for US equity exposure above the US$60,000 threshold.
            </p>
            <p>
              <span className="font-semibold text-slate-800">Does the AU–US DTA help?</span>{" "}
              The Australia–US DTA does include an estate-tax article (Article 27), which can
              provide some relief — but its application is not straightforward and depends on the
              total value of the estate and the proportion that is US-situs. Professional estate
              planning advice is strongly recommended for any estate with US-situs assets above the
              US$60,000 threshold.
            </p>
            <div className="bg-white border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-900 mb-1">Why the ETF structure is commonly used</p>
              <p className="text-xs text-amber-900 leading-relaxed">
                Many Australian investors with significant US-equity exposure use AU-listed ETFs
                (IVV, NDQ, VTS) rather than direct US shares precisely because the ETF unit is
                not US-situs. The management fee (0.03–0.04% for IVV and VTS) is often considered
                a reasonable cost for removing this estate-tax exposure for portfolios above the
                US$60,000 threshold. This is general information — whether this approach is
                appropriate for your circumstances requires advice from a cross-border tax and
                estate-planning specialist.
              </p>
            </div>
            <p className="text-xs text-slate-500 italic">
              This is general information only. US estate tax rules are complex and interact with
              the AU–US DTA, probate, trust structures, and basis-step-up provisions in ways that
              require specialist advice. Consult a registered tax agent or cross-border estate-planning
              specialist for advice specific to your situation.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION: CGT on foreign shares                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="cgt-foreign-shares" className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="General information"
            title="CGT on foreign shares — calculated in AUD"
            sub="This is general information on how the rules work. It is not tax advice."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              Australia taxes capital gains on the disposal of assets owned by Australian tax residents,
              regardless of where those assets are located. Foreign shares — whether US, Japanese,
              Hong Kong-listed, or anything else — are within the Australian CGT regime.
            </p>
            <p>
              <span className="font-semibold text-slate-800">The AUD calculation:</span> Australian CGT
              is calculated in AUD. Even though your shares are denominated in a foreign currency, the
              gain (or loss) is always calculated by converting both legs to AUD:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
              <li>
                <span className="font-semibold text-slate-700">Cost base:</span> The foreign-currency
                purchase price, converted to AUD at the exchange rate on the purchase date, plus
                any incidental costs (brokerage commissions, FX margin paid) also expressed in AUD.
              </li>
              <li>
                <span className="font-semibold text-slate-700">Proceeds:</span> The foreign-currency
                sale price, converted to AUD at the exchange rate on the sale date, less brokerage.
              </li>
              <li>
                <span className="font-semibold text-slate-700">AUD gain or loss:</span> Proceeds minus
                cost base. The 50% individual CGT discount applies if the asset was held for more
                than 12 months (33.33% for complying super funds; no discount for companies).
              </li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-800 mb-2">Illustrative example — currency movement creating a gain</p>
              <p className="text-xs text-amber-900 leading-relaxed">
                You buy US$10,000 of a US share when the AUD/USD rate is 0.70. Your AUD cost base is
                approximately A$14,286 (plus costs).<br /><br />
                Two years later you sell at the same US$10,000 price — the share hasn&apos;t moved.
                But the AUD/USD rate has fallen to 0.60. Your AUD proceeds are approximately A$16,667.<br /><br />
                Your AUD gain is approximately A$2,381 — entirely from currency movement, with zero
                gain in USD terms. After the 50% CGT discount (held &gt;12 months), your assessable
                gain is approximately A$1,190.
              </p>
            </div>
            <p>
              <span className="font-semibold text-slate-800">FX rates the ATO accepts:</span> The ATO
              publishes monthly average AUD/USD (and other currency pair) exchange rates that are
              generally acceptable for individual investors who are not in the business of foreign
              exchange. Daily spot rates are also acceptable. Most Australian-facing brokers include
              pre-converted AUD figures in their annual tax statements, which is your primary
              source document.
            </p>
            <p>
              <span className="font-semibold text-slate-800">Record-keeping:</span> Each purchase of
              foreign shares creates a separate CGT parcel with its own AUD cost base. Partial sales
              require you to identify which parcel(s) you are selling — the ATO&apos;s default is FIFO
              (first in, first out) if you don&apos;t specifically identify a parcel. For active investors
              holding many small parcels, record-keeping is a real compliance burden and accounting
              software or a tax agent is typically worthwhile.
            </p>
            <p className="text-xs text-slate-500 italic">
              This is general information only. CGT rules for your specific circumstances — entity
              type, residency, treaty application, SMSF trustee obligations — require advice from
              a registered tax agent.
            </p>
          </div>
        </div>
      </section>

      {/* ── Cross-border tax-agent lead ──────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Need personalised advice?"
            title="Cross-border tax agents for Australian investors"
            sub="This is general information — for advice on your situation, speak with a registered tax agent."
          />
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              The rules covered on this page — US dividend withholding, W-8BEN, FITO, US estate tax,
              and CGT on foreign shares — interact with each other and with your personal circumstances
              in ways that this general information cannot fully address. If you hold significant foreign
              investments or have a complex situation (SMSF, trust, company ownership, dual residency,
              or US-situs assets above US$60,000), a registered tax agent who specialises in
              cross-border investing is well worth the cost.
            </p>
            <p>
              The Tax Practitioners Board (TPB) maintains a public register of registered tax agents
              in Australia. When selecting an agent, look for one with specific experience in
              international tax and foreign-investment portfolios, not just general individual tax returns.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Link
                href="/advisors?specialty=tax"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs transition-colors"
              >
                Find a tax specialist on invest.com.au &rarr;
              </Link>
              <a
                href="https://www.tpb.gov.au/public-register"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-white text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                TPB Public Register (tax agents) &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cross-links ──────────────────────────────────────────────── */}
      <section className="py-8 bg-white border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Related guides</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/global-investing" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Global investing hub &rarr;</Link>
            <Link href="/global-investing/shares/us" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Buy US shares from Australia &rarr;</Link>
            <Link href="/global-investing/shares/asia" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Buy Asian shares from Australia &rarr;</Link>
            <Link href="/global-investing/etfs/us" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">US ETFs for Australians &rarr;</Link>
            <Link href="/global-investing/etfs/asia" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Asia ETFs for Australians &rarr;</Link>
            <Link href="/global-investing/calculators/currency-hedging-cost" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Currency hedging cost calculator &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING}{" "}
            Tax rules change. This page was last reviewed {UPDATED_LABEL}. Verify current rules with
            the ATO (ato.gov.au) or a registered tax agent before making decisions based on this content.
            Cross-border tax involving multiple countries (US estate tax, foreign withholding, FITO
            interactions) is particularly complex — this is general information only; see a registered
            tax agent for advice on your circumstances.
          </p>
        </div>
      </section>
    </div>
  );
}
