import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd, howToJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `How to Wind Up an SMSF in Australia (${CURRENT_YEAR} Guide) | Invest.com.au`,
  description:
    "Complete guide to winding up an SMSF: 7-step process, tax implications, in-specie transfers, rollover to APRA fund, costs ($2,000–$6,000+) and common mistakes to avoid.",
  alternates: { canonical: `${SITE_URL}/smsf/wind-up` },
  openGraph: {
    title: `How to Wind Up an SMSF in Australia (${CURRENT_YEAR} Guide)`,
    description:
      "Step-by-step guide to closing your SMSF correctly — ATO notifications, CGT events, final annual return, and how to avoid unexpected tax bills.",
    url: `${SITE_URL}/smsf/wind-up`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("How to Wind Up an SMSF")}&sub=${encodeURIComponent("7-Step Process · Tax · Rollover · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const WIND_UP_STEPS = [
  {
    n: 1,
    title: "Trustee resolution to wind up",
    body: "Hold a formal trustee meeting and record minutes. All trustees and members must agree to wind up the fund. The resolution must state the date winding up will commence. Keep the minutes on file — you may need to produce them for the ATO or auditor.",
  },
  {
    n: 2,
    title: "Notify the ATO",
    body: "Lodge the ATO notification as soon as possible after the resolution. You can do this through ATO Online Services for Business, the Business Portal, or via your registered tax agent. The fund cannot be formally wound up until the ATO is notified. The ATO will update the fund's status to \"Wound Up\" once all returns are lodged and no liabilities remain.",
  },
  {
    n: 3,
    title: "Realise (sell) assets",
    body: "Convert investments to cash by selling shares, managed funds, and other assets at market value. CGT events crystallise on the date of sale — timing matters significantly (see Tax section below). If transferring property or shares in-specie to members, this also triggers a CGT event at market value on the transfer date.",
  },
  {
    n: 4,
    title: "Pay all outstanding liabilities",
    body: "Clear every liability before distributing member benefits: outstanding accountant and tax agent fees, final audit invoice, ATO tax debts (including any income tax assessment for the final year), and any other creditors. Distributing benefits before paying liabilities is a compliance breach and can attract ATO penalties.",
  },
  {
    n: 5,
    title: "Pay or rollover member benefits",
    body: "Once liabilities are cleared, pay each member their entitlement. Options are: cash out as a lump sum (only if a condition of release is met — retirement, reaching preservation age, permanent incapacity, etc.); or rollover the balance electronically to an APRA-regulated fund (retail, industry, or public sector). Obtain a rollover request form from the receiving fund and use SuperStream for electronic transfer.",
  },
  {
    n: 6,
    title: "Lodge the final SMSF annual return",
    body: "The final annual return must cover the full period up to the date the last member benefit was paid. It must show a nil balance at year end. The trustee must also confirm the fund has been wound up in the return. Lodge within the standard due date unless your tax agent has a lodgement program extension.",
  },
  {
    n: 7,
    title: "Close fund bank accounts and cancel ABN/TFN",
    body: "After the ATO confirms the fund is wound up and the final return is processed, close all fund bank accounts (the account must remain open until the ATO confirms, so any final refunds or debits can be processed). Then cancel the fund's ABN and TFN through the Australian Business Register and ATO respectively.",
  },
];

const WIND_UP_TRIGGERS = [
  {
    trigger: "All members have retired",
    detail:
      "When all members have reached preservation age and moved to retirement income streams, many choose the simplicity of a retail or industry fund over ongoing SMSF compliance obligations.",
  },
  {
    trigger: "Balance too small to justify costs",
    detail:
      "The ATO and most SMSF specialists cite $200,000 as the rough threshold below which ongoing annual costs ($3,000–$7,000) erode returns versus a lower-cost industry fund alternative.",
  },
  {
    trigger: "Death of the sole or last member",
    detail:
      "When the last member dies, trustee obligations transfer to the legal personal representative (executor). The fund must still complete the full wind-up process and pay death benefits per the binding death benefit nomination or trustee discretion.",
  },
  {
    trigger: "Relationship breakdown between co-trustees",
    detail:
      "A marriage breakdown, business dispute, or family conflict between trustees can make ongoing joint decision-making impossible. Winding up is often the cleanest resolution.",
  },
  {
    trigger: "Member moving overseas permanently",
    detail:
      "A member who becomes a non-resident for more than two years may cause the fund to fail the active member test, putting its complying status at risk. Winding up or rolling over that member's balance avoids the compliance breach.",
  },
  {
    trigger: "Fund has compliance issues",
    detail:
      "An ATO audit finding an in-house asset breach, related-party transaction issue, or other non-compliance sometimes makes winding up more cost-effective than remediation, particularly for smaller funds.",
  },
];

const COST_ITEMS = [
  { item: "Final accountant / tax agent fees", range: "$1,500 – $4,000" },
  { item: "Final independent audit", range: "$500 – $2,000" },
  { item: "Asset sale brokerage (shares / ETFs)", range: "$5 – $30 per trade" },
  { item: "Real estate agent commission (if selling property)", range: "1.5% – 3% of sale price" },
  { item: "Stamp duty on in-specie property transfer", range: "State-dependent (up to 5.5%)" },
  { item: "Legal fees (if estate / dispute involved)", range: "$2,000 – $10,000+" },
];

const COMMON_MISTAKES = [
  {
    mistake: "Winding up without resolving all ATO tax liabilities",
    consequence:
      "The ATO will not mark the fund as wound up while a tax debt is outstanding. Closing the bank account before the debt is cleared creates a compliance and cash-flow problem.",
  },
  {
    mistake: "Failing to lodge the final annual return",
    consequence:
      "The fund remains on the ATO's register as active. Annual supervisory levies continue to accrue. The trustees remain legally responsible for a fund that no longer exists in practice.",
  },
  {
    mistake: "Closing bank accounts before the ATO process is complete",
    consequence:
      "Any final tax refund or ATO-issued notice will be undeliverable. Keep the account open until you have written confirmation the fund status is \"Wound Up\".",
  },
  {
    mistake: "Ignoring insurance before rolling over",
    consequence:
      "Life, TPD, and income protection insurance held inside the SMSF (or through a retail policy in the fund's name) is cancelled when the fund closes. Members must arrange replacement cover before or simultaneously with the rollover — obtaining insurance later may require fresh underwriting.",
  },
  {
    mistake: "Incorrect CGT calculations on asset disposals",
    consequence:
      "Mixing up cost base records, applying the wrong tax rate (accumulation vs. pension phase), or forgetting the CGT discount for assets held over 12 months leads to under- or over-paying tax. Obtain a written CGT schedule from your accountant.",
  },
];

const FAQS = [
  {
    q: "How long does it take to wind up an SMSF?",
    a: "Most SMSF wind-ups take between 3 and 12 months from the trustee resolution to the ATO confirming the fund is wound up. Cash and share-only funds typically complete in 3–6 months. Funds holding direct property can take 9–18 months or longer if the property sale is delayed by market conditions. The ATO expects trustees to act with reasonable diligence and not drag out the process unnecessarily.",
  },
  {
    q: "What are the tax implications of winding up an SMSF?",
    a: "The main tax event is capital gains tax (CGT) on asset sales. In the accumulation phase, CGT applies at 15% on net gains, reduced to an effective 10% rate for assets held more than 12 months (the one-third discount). In the pension phase (where the fund is paying a retirement income stream), investment income including capital gains is taxed at 0%. Timing the wind-up while the fund is still in pension phase can significantly reduce the tax bill. If assets are transferred in-specie to members rather than sold, a CGT event still occurs at market value on the transfer date.",
  },
  {
    q: "Can I transfer property out of my SMSF without selling it?",
    a: "Yes. An in-specie transfer moves an asset (such as an investment property or share portfolio) from the SMSF to a member's personal name without a cash sale. The transfer is treated as occurring at market value, triggering a CGT event for the fund. For property, stamp duty may also apply at state level — this can be a significant cost (up to 5.5% of property value in some states). Some states offer exemptions or concessions for SMSF wind-up transfers; check with a solicitor in the relevant state before proceeding.",
  },
  {
    q: "What happens to my super insurance when I wind up my SMSF?",
    a: "Any life, TPD, or income protection insurance policy held by the SMSF (or in the fund's name) is cancelled when the fund is wound up. If you are rolling over to an industry or retail fund, check whether the receiving fund has automatic acceptance insurance for incoming rollovers and whether waiting periods apply. Do not close the SMSF until you have arranged replacement cover or confirmed the receiving fund's automatic acceptance rules — once the SMSF closes, you may need to go through full medical underwriting to obtain equivalent cover.",
  },
  {
    q: "Do I need to lodge a final tax return when winding up an SMSF?",
    a: "Yes, a final SMSF annual return must be lodged for the period from the start of the income year to the date the last member benefit was paid. The return must show a nil closing balance and confirm the fund has been wound up. The ATO will not update the fund's status to Wound Up until the final return is processed and any resulting tax liability is paid. Failing to lodge the final return means the fund remains active on the ATO register and supervisory levies continue to accrue.",
  },
];

export default function SmsfWindUpPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Wind Up SMSF", url: absoluteUrl("/smsf/wind-up") },
  ]);
  const faq = faqJsonLd(FAQS);

  // HowTo JSON-LD built from the rendered wind-up steps, with step/page URLs
  // patched to this page (not /how-to/).
  const howToLd = howToJsonLd({
    slug: "smsf-wind-up",
    h1: `How to Wind Up an SMSF in Australia (${CURRENT_YEAR} Guide)`,
    intro:
      "The formal process to wind up a self-managed super fund: pass a trustee resolution, notify the ATO, realise assets, pay liabilities, pay or rollover member benefits, lodge the final annual return, and close accounts and cancel the ABN/TFN.",
    steps: WIND_UP_STEPS.map((s) => ({ heading: s.title, body: s.body })),
  });
  const howTo = {
    ...howToLd,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl("/smsf/wind-up"),
    },
    step: howToLd.step?.map(
      (
        s: { "@type": string; position: number; name: string; text: string; url: string },
        i: number,
      ) => ({
        ...s,
        url: absoluteUrl(`/smsf/wind-up#step-${i + 1}`),
      }),
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
      />
      {faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
        />
      )}

      <div className="bg-white min-h-screen">
        {/* ── Hero ── */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="text-slate-600">/</span>
              <Link href="/smsf" className="hover:text-white">
                SMSF
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Wind Up SMSF</span>
            </nav>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">
              {UPDATED_LABEL}
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              How to Wind Up an SMSF in Australia ({CURRENT_YEAR} Guide)
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              Winding up an SMSF takes seven steps — pass a trustee resolution, notify the ATO,
              realise assets, pay all liabilities, pay or rollover member benefits, lodge the final
              annual return, then close the bank accounts and cancel the ABN/TFN — and typically
              costs $2,000–$6,000+ over a 3–12 month timeline. Done incorrectly it can trigger
              unexpected CGT bills, ongoing levies, and penalties; this guide covers every step.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              {[
                { v: "3–12 months", l: "Typical wind-up timeline" },
                { v: "$200K", l: "Balance threshold often cited" },
                { v: "0%", l: "CGT in pension phase" },
                { v: "10%", l: "Effective CGT rate (accum., 12m+)" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2.5"
                >
                  <dt className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">
                    {s.l}
                  </dt>
                  <dd className="text-lg md:text-xl font-extrabold text-white mt-0.5">{s.v}</dd>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── When to wind up ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              When should you wind up your SMSF?
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-3xl">
              There is no single right time to wind up an SMSF. The most common triggers involve
              a change in member circumstances that removes the original reason for running a
              self-managed fund.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WIND_UP_TRIGGERS.map((t) => (
                <div
                  key={t.trigger}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                >
                  <h3 className="font-extrabold text-slate-900 mb-1.5">{t.trigger}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{t.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm text-amber-900 leading-relaxed">
                <strong>Balance threshold guidance:</strong> The $200,000 threshold is a
                rule-of-thumb, not an ATO rule. A fund with $180,000 and a clear property
                strategy may still make sense. A fund with $350,000 and no compelling reason for
                self-management may not. Run the numbers with your SMSF accountant before
                deciding.
              </p>
            </div>
          </div>
        </section>

        {/* ── 7-step wind-up process ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              The 7-step wind-up process
            </h2>
            <p className="text-sm text-slate-600 mb-8 leading-relaxed max-w-3xl">
              Every step must be completed in order. Skipping or reversing steps — particularly
              paying member benefits before clearing liabilities — is a compliance breach.
            </p>
            <div className="space-y-4">
              {WIND_UP_STEPS.map((s) => (
                <div
                  key={s.n}
                  className="flex gap-5 rounded-xl border border-slate-200 bg-white p-5"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-extrabold text-lg shrink-0 mt-0.5">
                    {s.n}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CGT and tax on wind-up ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              CGT and tax when winding up
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-3xl">
              Capital gains tax is the largest potential tax cost in a wind-up. The rate depends
              on the fund&apos;s phase at the time assets are sold, and on how long the fund held
              each asset.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-6">
              <table className="w-full text-sm" aria-label="CGT rates when winding up an SMSF by fund phase and holding period">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Fund phase
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Asset held &lt; 12 months
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Asset held &gt; 12 months
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-bold">Accumulation phase</td>
                    <td className="px-4 py-3">15% on net gain</td>
                    <td className="px-4 py-3">10% effective rate (one-third discount)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">Pension phase (100%)</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">0%</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">0%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">
                      Mixed (part accum., part pension)
                    </td>
                    <td className="px-4 py-3">Proportional — based on pension asset percentage</td>
                    <td className="px-4 py-3">Proportional — based on pension asset percentage</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-2">
                  Wind up in pension phase if possible
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  If all members are in a retirement income stream (account-based pension), the
                  fund&apos;s entire investment income — including capital gains on asset sales — is
                  tax-free. This is the most tax-efficient time to wind up. Where members are
                  eligible to start a pension but have not yet done so, consider commencing it
                  before initiating the wind-up.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-extrabold text-amber-900 mb-2">
                  Timing the 12-month threshold
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  If the fund is in accumulation and you intend to sell an asset that was
                  purchased less than 12 months ago, waiting until the 12-month anniversary
                  before selling reduces the effective CGT rate from 15% to 10%. On a $500,000
                  asset with a $100,000 gain that&apos;s a $5,000 difference. Balance this against
                  ongoing administration costs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── In-specie transfers ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              In-specie transfers to members
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-3xl">
              Instead of selling assets and distributing cash, trustees can transfer assets
              directly from the SMSF to a member&apos;s personal ownership — known as an
              in-specie transfer. This is particularly common for investment properties a member
              wants to continue holding in their personal name.
            </p>
            <div className="space-y-3">
              {[
                {
                  heading: "CGT still applies",
                  text: "The transfer is treated as a disposal at market value on the date of transfer, triggering a CGT event for the fund. The fund is treated as having received the market value even though no cash changed hands. A registered valuation is required for property.",
                },
                {
                  heading: "Stamp duty on property transfers",
                  text: "In most Australian states and territories, transferring real property — even from an SMSF to its member — attracts stamp duty at standard rates. This can represent 3%–5.5% of the property value. Some states offer concessions for SMSF wind-up scenarios; engage a solicitor in the relevant state before proceeding.",
                },
                {
                  heading: "Shares and ETFs",
                  text: "Listed securities can be transferred in-specie without stamp duty in most states. The broker used by the SMSF transfers the holding from the fund's HIN (CHESS) to the member's personal HIN. The member's cost base for future CGT purposes becomes the market value at the transfer date.",
                },
                {
                  heading: "Conditions of release",
                  text: "In-specie transfers to members are treated as benefit payments. The member must have met a condition of release (e.g., reached retirement, reached preservation age under a transition to retirement arrangement, or another ATO-recognised condition) before the transfer can proceed.",
                },
              ].map((item) => (
                <div
                  key={item.heading}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <h3 className="font-extrabold text-slate-900 mb-1">{item.heading}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Rollover to APRA fund ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Rolling over to an APRA-regulated fund
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-3xl">
              For most members, rolling the balance to a retail or industry fund is the simplest
              outcome. The fund sells its assets, pays all liabilities, and transfers the
              remaining cash to the receiving fund via SuperStream.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                {
                  step: "1",
                  heading: "Choose the receiving fund",
                  text: "Research fees, investment options, and insurance terms before committing. Once the SMSF is wound up, switching again will incur further costs.",
                },
                {
                  step: "2",
                  heading: "Obtain rollover request form",
                  text: "Each member completes a rollover request (also called a rollover authority) from their receiving fund. This authorises the SMSF trustee to transfer the benefit.",
                },
                {
                  step: "3",
                  heading: "Transfer via SuperStream",
                  text: "Electronic rollover via the SuperStream system typically settles within 3 business days. Your SMSF administrator or tax agent will initiate this through the ATO's clearing house.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-extrabold text-slate-900 mb-1">{item.heading}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h3 className="font-extrabold text-red-900 mb-2">
                Sort out insurance before you roll over
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                If the SMSF holds life, TPD, or income protection insurance, those policies are
                cancelled when the fund closes. Check whether the receiving fund offers automatic
                acceptance insurance for incoming rollovers — and check the cover limits and
                waiting periods. If you have a pre-existing condition or have recently made a
                claim, you may not be able to obtain equivalent cover under the new fund&apos;s
                automatic acceptance rules. Arrange replacement cover before or simultaneously
                with the rollover, not after.
              </p>
            </div>
          </div>
        </section>

        {/* ── Death of a member ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Death of the last member
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-3xl">
              When the sole or last surviving member of an SMSF dies, the fund does not
              automatically dissolve. Trustee obligations transfer to the deceased&apos;s legal
              personal representative (the executor of their estate), who must complete the
              full wind-up process.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  heading: "Death benefits — binding vs. trustee discretion",
                  text: "If the member had a valid binding death benefit nomination (BDBN), the trustee must pay the death benefit to the nominated recipient in the nominated form (lump sum or income stream). If there is no BDBN, or the BDBN has lapsed, the trustee (now the legal personal representative) has discretion to pay to any eligible dependent or the estate.",
                },
                {
                  heading: "Tax on death benefits",
                  text: "Death benefits paid to a tax-dependent (spouse, child under 18, financial dependent) are generally tax-free. Benefits paid to a non-dependent (e.g., adult children) from the taxable component attract a 15% tax plus 2% Medicare levy on the taxable component. Structuring the payout correctly can significantly reduce tax for non-dependent beneficiaries.",
                },
                {
                  heading: "Reversionary pensions",
                  text: "If the deceased was in a pension phase and the pension had a reversionary beneficiary nominated, the pension automatically reverts to that beneficiary without a new trustee decision. The reversionary beneficiary then receives ongoing pension payments while the wind-up of the fund proceeds around them.",
                },
                {
                  heading: "Estate planning considerations",
                  text: "An executor may not have the knowledge or time to manage an SMSF's investments and compliance obligations during probate. Engaging an SMSF specialist to assist the executor through the wind-up process is strongly recommended, particularly where the fund holds property or complex assets.",
                },
              ].map((item) => (
                <div
                  key={item.heading}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <h3 className="font-extrabold text-slate-900 mb-1.5">{item.heading}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Costs ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              What does it cost to wind up an SMSF?
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-3xl">
              Expect total wind-up costs of $2,000–$6,000 for a cash and shares fund, and
              significantly more if property is involved.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-4">
              <table className="w-full text-sm" aria-label="SMSF wind-up costs by item">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Cost item
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Indicative range
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COST_ITEMS.map((c) => (
                    <tr key={c.item}>
                      <td className="px-4 py-3 text-slate-800">{c.item}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{c.range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              Ranges are indicative only and will vary depending on fund complexity, adviser
              rates, and property location. Obtain itemised quotes before proceeding.
            </p>
          </div>
        </section>

        {/* ── Timeline ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Realistic wind-up timeline
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-3xl">
              The ATO expects trustees to wind up within a reasonable timeframe. There is no
              published deadline, but the ATO has indicated it monitors funds that remain
              in the wind-up phase for extended periods.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  phase: "Cash and shares fund",
                  timeframe: "3–6 months",
                  detail:
                    "Asset sales complete quickly. Main delay is the final annual return processing and ATO confirmation of wound-up status.",
                },
                {
                  phase: "Fund with listed property trusts",
                  timeframe: "4–8 months",
                  detail:
                    "A-REITs and managed funds require standard settlement periods. Timing redemptions around net asset value dates can affect realised value.",
                },
                {
                  phase: "Fund with direct property",
                  timeframe: "9–18+ months",
                  detail:
                    "Property sale timelines depend on market conditions, agent campaigns, and settlement periods. In-specie transfers may be faster but involve stamp duty.",
                },
              ].map((t) => (
                <div
                  key={t.phase}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-1">
                    {t.phase}
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900 mb-2">{t.timeframe}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{t.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Common mistakes ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Common mistakes and how to avoid them
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-3xl">
              Most wind-up errors stem from rushing the process or misunderstanding the ATO&apos;s
              requirements. Each of the mistakes below has cost Australian SMSF trustees real
              money in penalties or unexpected tax bills.
            </p>
            <div className="space-y-3">
              {COMMON_MISTAKES.map((m) => (
                <div
                  key={m.mistake}
                  className="rounded-xl border border-red-100 bg-red-50 p-5"
                >
                  <h3 className="font-extrabold text-red-900 mb-1">{m.mistake}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{m.consequence}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Alternatives to winding up ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Alternatives to winding up
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-3xl">
              Before committing to wind-up, consider whether restructuring the fund solves the
              underlying problem at lower cost and disruption.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  heading: "Restructure trustee structure",
                  text: "If the problem is an unwieldy multi-member arrangement, removing departing members and restructuring from four individual trustees to two (or converting to a corporate trustee with fewer directors) can significantly reduce complexity without closing the fund.",
                },
                {
                  heading: "Engage a lower-cost administrator",
                  text: "If cost is the issue, online SMSF administration platforms (e.g., Class, BGL, Heffron, or SuperConcepts) can reduce annual administration costs to $1,500–$2,500, making the fund viable at lower balances than traditional accountant-managed structures.",
                },
                {
                  heading: "Convert to a managed account structure",
                  text: "Some SMSF platforms allow trustees to delegate investment management to a professional managed account overlay within the SMSF, reducing the ongoing trustee workload while retaining the tax benefits and legal ownership of the fund.",
                },
              ].map((a) => (
                <div
                  key={a.heading}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <h3 className="font-extrabold text-slate-900 mb-1.5">{a.heading}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{a.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Frequently asked questions
            </h2>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {FAQS.map((f) => (
                <details key={f.q} className="group bg-white">
                  <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none font-extrabold text-slate-900 text-sm hover:bg-slate-50 transition-colors">
                    {f.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform duration-200 text-base leading-none" aria-hidden="true">
                      &#8964;
                    </span>
                  </summary>
                  <div className="px-5 pb-5 pt-1">
                    <p className="text-sm text-slate-600 leading-relaxed">{f.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Advice warning ── */}
        <section className="py-8 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                General advice warning
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                Winding up an SMSF involves complex tax and legal considerations specific to your
                fund&apos;s circumstances. Engage an SMSF specialist — ideally one accredited by the
                SMSF Association — before commencing the wind-up process.
              </p>
            </div>
          </div>
        </section>

        <HubAdvisorCTA
          heading="Get help winding up your SMSF correctly"
          subheading="Winding up an SMSF incorrectly can trigger penalties and tax liabilities. An SMSF specialist accredited by the SMSF Association can manage the rollover, final audit, and ATO deregistration."
          intent={{ need: "smsf", context: ["smsf_wind_up", "smsf_compliance"] }}
          source="smsf_wind_up"
          ctaLabel="Find an SMSF specialist"
          className="py-12 bg-amber-50 border-t border-amber-200"
        />

        {/* ── Cross-links ── */}
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-lg font-extrabold text-slate-900 mb-4">Related SMSF guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Link
                href="/smsf/setup"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900 transition-colors"
              >
                Setting up an SMSF &rarr;
              </Link>
              <Link
                href="/smsf/auditors"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900 transition-colors"
              >
                SMSF Auditors &rarr;
              </Link>
              <Link
                href="/smsf/property"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900 transition-colors"
              >
                Property in an SMSF &rarr;
              </Link>
              <Link
                href="/advisors/smsf-specialists"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900 transition-colors"
              >
                Find an SMSF Specialist &rarr;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
