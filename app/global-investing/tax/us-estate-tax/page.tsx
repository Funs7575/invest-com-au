import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import type { FaqItem } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `US Estate Tax for Australian Investors (${CURRENT_YEAR}) | invest.com.au`,
  description: `US estate tax for Australians: 40% on US-situs assets above US$60k. No AU-US treaty — how AU-domiciled ETFs eliminate the risk. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `US Estate Tax for Australian Investors (${CURRENT_YEAR})`,
    description:
      "Non-resident-alien exposure, the US$60k threshold, no Australia-US estate-tax treaty, and how AU-domiciled ETFs eliminate the risk.",
    url: `${SITE_URL}/global-investing/tax/us-estate-tax`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("US Estate Tax — Australians")}&sub=${encodeURIComponent("The overlooked risk for direct US-share investors · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/tax/us-estate-tax` },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const KEY_STATS = [
  { value: "US$60,000", label: "NRA exemption", sub: "Total US-situs assets before estate tax bites" },
  { value: "40%", label: "Top estate-tax rate", sub: "On US-situs assets above the exemption" },
  { value: "US$13.6M", label: "US-citizen exemption", sub: "2024 figure — not available to Australians" },
  { value: "No treaty", label: "Australia–US estate tax", sub: "Australia abolished its own estate taxes in 1979" },
];

const SITUS_ASSETS = [
  {
    asset: "Direct US shares (Apple, Microsoft, Tesla held in your name)",
    caught: true,
    text: "Shares in US corporations are US-situs regardless of where you live or where the share certificate sits.",
  },
  {
    asset: "US-domiciled ETFs (VOO, SPY, the US-listed IVV, VTS, VEU)",
    caught: true,
    text: "A US-domiciled fund is itself a US-situs asset — even if you bought it through an Australian broker.",
  },
  {
    asset: "US real estate (direct property holdings)",
    caught: true,
    text: "Real property physically located in the US is always US-situs.",
  },
  {
    asset: "US corporate bonds",
    caught: true,
    text: "Generally US-situs, though some debt qualifies for the portfolio-interest exemption — check each holding.",
  },
  {
    asset: "Cash in a US bank account",
    caught: false,
    text: "US bank deposits are specifically exempt from US estate tax for non-resident aliens.",
  },
  {
    asset: "US Treasury bonds",
    caught: false,
    text: "Generally exempt under the portfolio-interest exemption for NRAs.",
  },
];

const NOT_SITUS = [
  {
    title: "Australian-domiciled ETFs that hold US shares",
    text: "An ASX-listed, Australian-domiciled ETF is a unit in an Australian trust — not a US asset — even if 100% of its holdings are US shares.",
  },
  {
    title: "The critical distinction: domicile, not listing venue",
    text: "An ASX listing alone does not make an ETF safe. What matters is where the fund is domiciled. An Australian-domiciled ETF holding US shares is NOT US-situs; a US-domiciled ETF is US-situs and caught — even when you buy it on the ASX.",
  },
  {
    title: "The planning insight",
    text: "Gaining US-share exposure through Australian-domiciled funds keeps your US-situs holdings at zero, so US estate tax never applies.",
  },
];

const RATE_BANDS = [
  { band: "First US$60,000", rate: "0% (exempt)", note: "Covered by the NRA unified credit" },
  { band: "US$60,000 – US$80,000", rate: "26%", note: "Lowest band above the exemption" },
  { band: "US$150,000 – US$250,000", rate: "32%", note: "" },
  { band: "Over US$1,000,000", rate: "40%", note: "Top marginal rate" },
];

const MITIGATION = [
  {
    title: "Hold US shares via Australian-domiciled ETFs",
    text: "Products such as the ASX-listed IVV, VGS and A200 give US or global exposure without creating US-situs assets — provided the fund is Australian-domiciled. Verify the domicile in the PDS before relying on this.",
  },
  {
    title: "Keep direct US-situs holdings under US$60,000",
    text: "If you want to hold US shares directly, staying below the US$60,000 threshold keeps your estate out of the US estate-tax net.",
  },
  {
    title: "Use Australian-domiciled managed funds for US exposure",
    text: "Unlisted Australian managed funds investing in US markets are units in an Australian trust, not US-situs assets.",
  },
  {
    title: "Consider a company or trust structure",
    text: "Holding US assets through a non-US company or trust can change the situs analysis — but this is complex, has its own tax consequences, and needs specialist cross-border advice before you act.",
  },
  {
    title: "This is vehicle choice, not tax avoidance",
    text: "Choosing an Australian-domiciled fund over a US-domiciled one is a legitimate structuring decision, not an aggressive scheme. You pay the same Australian income tax and CGT either way.",
  },
];

const ENFORCEMENT = [
  {
    title: "Brokers freeze the account on death",
    text: "Brokers such as Interactive Brokers will freeze a deceased non-resident's account pending estate clearance, regardless of the amount held.",
  },
  {
    title: "An IRS transfer certificate may be required",
    text: "Before releasing US-situs assets of a deceased NRA, a US custodian may insist on an IRS transfer certificate (Form 5173) confirming the estate-tax position is settled.",
  },
  {
    title: "Executors must file IRS Form 706-NA",
    text: "The US estate-tax return for non-resident aliens is Form 706-NA, generally due within nine months of death. The legal liability exists even if practical enforcement varies.",
  },
];

const DOMICILE_CHECK = [
  {
    title: "Check the PDS and the issuer",
    text: "The Product Disclosure Statement states the fund's domicile and responsible entity. An Australian responsible entity and an Australian-registered scheme point to Australian domicile.",
  },
  {
    title: "Read the ASX listing details, not just the ticker",
    text: "An ASX listing does not guarantee Australian domicile. Some ASX-quoted products are cross-listed wrappers over a US-domiciled fund.",
  },
  {
    title: "VTS and VEU are US-domiciled — caught",
    text: "Vanguard's VTS (US Total Market) and VEU (All-World ex-US) are quoted on the ASX but domiciled in the US, so they are US-situs assets. Verify the current status before relying on this.",
  },
  {
    title: "The ASX IVV (iShares S&P 500) is Australian-domiciled — safe",
    text: "The ASX version of IVV is an Australian-domiciled fund and is not a US-situs asset. Always re-confirm domicile in the latest PDS, as product structures can change.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Do Australians pay US estate tax on US shares?",
    a: "They can. If an Australian dies holding more than US$60,000 of US-situs assets — most commonly US shares held directly through brokers like IBKR, Stake or Tiger — the estate may owe US federal estate tax on the amount above the US$60,000 exemption, at rates rising to 40%. Australian residency does not exempt you; what matters is whether the assets are US-situs. The simplest way to avoid the issue is to hold US-market exposure through Australian-domiciled ETFs instead of directly.",
  },
  {
    q: "How do I avoid US estate tax as an Australian investor?",
    a: "The cleanest structural fix is to hold US or global exposure via Australian-domiciled ETFs or managed funds rather than directly owning US-listed shares or US-domiciled ETFs. An Australian-domiciled fund is a unit in an Australian trust, not a US-situs asset, so US estate tax does not apply even if the fund holds 100% US shares. If you want to hold US shares directly, keeping your total US-situs holdings under US$60,000 also keeps you out of the net. This is a vehicle-choice decision, not illegal tax avoidance.",
  },
  {
    q: "Are Australian-domiciled ETFs subject to US estate tax?",
    a: "No. An Australian-domiciled ETF is treated as Australian property for US estate-tax purposes, even when it invests entirely in US shares — so it is not a US-situs asset and falls outside US estate tax. The catch is that domicile, not the ASX listing, is what matters. Vanguard's VTS and VEU are quoted on the ASX but are US-domiciled, so they are caught; the ASX version of IVV is Australian-domiciled and is not. Always confirm the domicile in the fund's PDS.",
  },
  {
    q: "What is the US estate tax threshold for non-residents?",
    a: "For non-resident aliens — including most Australian investors — the exemption is only US$60,000 of total US-situs assets, far below the roughly US$13.6M (2024) exemption available to US citizens and residents. US-situs assets above US$60,000 are exposed to estate tax at progressive rates reaching 40%. The threshold applies to the combined value of all US-situs assets in the estate, not per holding.",
  },
  {
    q: "Does Australia have an estate tax treaty with the US?",
    a: "No. Australia abolished its own death and estate duties in 1979 and does not have an estate-tax treaty with the United States. That means Australians get no treaty-based relief or uplifted threshold — they are limited to the US$60,000 non-resident-alien exemption. Some other countries, such as the UK and Germany, do have US estate-tax treaties that raise the effective threshold, but Australians cannot rely on those.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function UsEstateTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Tax", url: `${SITE_URL}/global-investing/tax` },
    { name: "US Estate Tax" },
  ]);
  const faqLd = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span className="text-slate-300">/</span>
            <Link href="/global-investing/tax" className="hover:text-slate-900">Tax</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">US Estate Tax</span>
          </nav>

          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-lg" aria-hidden="true">!</div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-50 border border-red-200 rounded-full text-xs font-bold text-red-700 mb-2">
                A little-known risk for direct US-share investors
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                US estate tax for Australian investors
              </h1>
            </div>
          </div>

          <p className="text-base md:text-lg text-slate-600 leading-relaxed mb-3">
            An Australian investor who dies holding US-situs assets worth more than{" "}
            <strong className="text-slate-900">US$60,000</strong> may be liable for US federal
            estate tax of up to <strong className="text-slate-900">40%</strong> on the excess.
            This catches many Australians who invest directly in US shares through brokers such as
            Stake, IBKR or Tiger — even if they&apos;ve never set foot in the United States.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            The good news: the exposure is almost entirely avoidable. Holding US-market exposure
            through <strong className="text-slate-900">Australian-domiciled ETFs</strong> rather
            than directly removes the risk completely. This guide explains what is caught, what
            isn&apos;t, why Australia gets no treaty relief, and how to structure around it.
          </p>
          <p className="text-xs text-slate-400">
            {UPDATED_LABEL} · General information only · Not tax, legal or estate-planning advice
          </p>
        </div>
      </section>

      {/* ── Key numbers ────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">The headline numbers</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5">
            What Australians are actually exposed to
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {KEY_STATS.map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="text-lg md:text-2xl font-extrabold text-amber-600">{s.value}</div>
                <div className="text-[0.7rem] font-bold text-slate-900 mt-0.5 leading-tight">{s.label}</div>
                <div className="text-[0.6rem] text-slate-500 mt-0.5 leading-snug">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What is US estate tax ──────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">The basics</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            What is US estate tax?
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            US estate tax is a federal tax on the transfer of assets at death. For US citizens and
            US residents (domiciliaries), the exemption is very high — around{" "}
            <strong className="text-slate-900">US$13.6M in 2024</strong> — so most US estates pay
            nothing. But for <strong className="text-slate-900">non-resident aliens</strong> (NRAs),
            which is how the US classifies most Australian investors, the exemption is dramatically
            smaller: only <strong className="text-slate-900">US$60,000</strong> of US-situs assets.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            That gap is the whole problem. The same Apple or Microsoft shareholding a US resident
            could pass on tax-free up to US$13.6M is exposed to estate tax in an Australian
            investor&apos;s estate once their total US-situs assets exceed US$60,000. The tax is
            assessed on the market value at the date of death and is a liability of the estate.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Key term — &quot;situs&quot;.</strong> Situs is simply
              where an asset is treated as located for US estate-tax purposes. US estate tax only
              reaches <em>US-situs</em> assets. The entire planning question for Australians is which
              of their holdings count as US-situs — and, crucially, that an Australian-domiciled ETF
              holding US shares does not.
            </p>
          </div>
        </div>
      </section>

      {/* ── US-situs assets caught ─────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">What&apos;s in the net</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Which assets are US-situs?
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Not everything American is caught. The table below shows the assets Australians most
            commonly hold and whether each counts as a US-situs asset for estate-tax purposes.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm" aria-label="US-situs assets — which assets Australians hold that are subject to US estate tax">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-slate-600">Asset</th>
                  <th scope="col" className="text-center px-3 py-3 text-xs font-bold text-slate-600">US-situs?</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-slate-600 hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {SITUS_ASSETS.map((row, i) => (
                  <tr key={row.asset} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-4 py-3 font-medium text-slate-800 text-xs sm:text-sm">
                      {row.asset}
                      <div className="text-[0.65rem] text-slate-500 font-normal mt-1 sm:hidden">{row.text}</div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.caught ? (
                        <span className="inline-block px-2 py-0.5 bg-red-50 text-red-700 text-xs font-bold rounded-full">Caught</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">Not caught</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed hidden sm:table-cell">{row.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.65rem] text-slate-500 mt-2">
            Cash in US bank accounts and US Treasury bonds are generally exempt for non-resident
            aliens; corporate-bond treatment depends on the instrument. Confirm each holding with a
            cross-border tax adviser.
          </p>
        </div>
      </section>

      {/* ── Assets NOT caught ──────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-600 mb-1">The key planning insight</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            The assets that are NOT caught
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            This is the part most investors miss — and it is where the entire mitigation strategy
            lives. The decisive factor is the fund&apos;s <strong className="text-slate-900">domicile</strong>,
            not where it happens to be listed.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-5">
            {NOT_SITUS.map((item) => (
              <div key={item.title} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">{item.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Worked contrast.</strong> Vanguard&apos;s VTS is
              ASX-quoted but US-domiciled, so it <span className="text-red-700 font-semibold">is</span>{" "}
              a US-situs asset and is caught. By contrast, VGS on the ASX is Australian-domiciled, so
              it is <span className="text-emerald-700 font-semibold">not</span> US-situs — even though
              both give you US-share exposure. Investing in US shares through Australian-domiciled
              ETFs therefore avoids US estate tax entirely.
            </p>
          </div>
        </div>
      </section>

      {/* ── The US$60,000 threshold ────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">The threshold</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            The US$60,000 threshold and how the tax stacks up
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The US$60,000 exemption applies to the <strong className="text-slate-900">total value
            of all US-situs assets</strong> in the estate, not to each holding separately. Once the
            combined value exceeds US$60,000, the estate may owe US estate tax on the excess, at
            progressive rates rising to 40%. The first US$60,000 is sheltered by the unified credit
            available to non-resident aliens.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            To put it in perspective: roughly <strong className="text-slate-900">AUD$500,000</strong> of
            directly-held US shares would translate to several hundred thousand US dollars of
            US-situs assets — well into the upper rate bands — and could face a significant US
            estate-tax bill on top of whatever the estate deals with in Australia.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            The rate bands below are <strong className="text-slate-900">illustrative</strong> and
            show how the marginal rate climbs with the value of US-situs assets above the exemption.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm" aria-label="US estate tax rate bands for non-resident aliens — marginal rates by asset value">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-slate-600">US-situs assets</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-bold text-slate-600">Marginal rate</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-slate-600 hidden sm:table-cell">Note</th>
                </tr>
              </thead>
              <tbody>
                {RATE_BANDS.map((row, i) => (
                  <tr key={row.band} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-4 py-3 font-medium text-slate-800 text-xs sm:text-sm">{row.band}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs sm:text-sm font-bold text-slate-900">{row.rate}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 leading-relaxed hidden sm:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.65rem] text-slate-500 mt-2">
            Illustrative rate schedule for non-resident aliens as of {CURRENT_YEAR}; the first
            US$60,000 is effectively exempt via the unified credit. Exact computation, deductions and
            credits require a US Form 706-NA and professional advice.
          </p>
        </div>
      </section>

      {/* ── The treaty (or lack of one) ────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-red-600 mb-1">No relief for Australians</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            The Australia–US estate tax treaty: there isn&apos;t one
          </h2>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Australia does NOT have an estate-tax treaty with
              the United States.</strong> Australia abolished its own death and estate duties in
              1979, so there is no Australian estate tax for a treaty to coordinate with — and no
              treaty was ever put in place. The practical consequence: Australians get{" "}
              <strong className="text-slate-900">no treaty relief</strong> and are limited to the
              bare US$60,000 non-resident-alien exemption.
            </p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            This is a common point of confusion, because Australia <em>does</em> have a comprehensive
            income-tax treaty with the US (the one that lets you claim the 15% dividend-withholding
            rate via a W-8BEN). That income-tax treaty is separate and does nothing for estate tax.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Some other countries — including the United Kingdom and Germany — <em>do</em> have US
            estate-tax treaties that effectively lift the threshold for their residents. Australians
            cannot benefit from those treaties. For an Australian investor, the only reliable lever
            is structuring the investment so the assets are not US-situs in the first place.
          </p>
        </div>
      </section>

      {/* ── Mitigation strategies ──────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">What to do about it</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Practical mitigation strategies
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            None of these is about avoiding tax illegally — they are about choosing the right
            investment vehicle for your circumstances.
          </p>

          <div className="space-y-3">
            {MITIGATION.map((item, i) => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-5 flex gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{item.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Enforcement ────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">In practice</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            How it&apos;s actually enforced
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            The legal liability sits with the estate regardless of practical enforcement — but in
            practice the friction usually shows up at the broker, when the estate tries to access or
            transfer the deceased&apos;s holdings.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {ENFORCEMENT.map((item) => (
              <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">{item.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Checking ETF domicile ──────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Due diligence</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            Checking whether an ETF is Australian or US domiciled
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Because domicile is what determines US-situs status, it is worth confirming before you
            assume an ASX-listed ETF is safe. Here is how to check.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {DOMICILE_CHECK.map((item) => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">{item.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="text-[0.65rem] text-slate-500 mt-3">
            Fund structures and domiciles can change. Always re-confirm the current domicile in the
            latest PDS before relying on any specific ticker for estate-tax planning.
          </p>
        </div>
      </section>

      {/* ── Worked example ─────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Worked example</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            Same exposure, very different estate-tax outcome
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2">Caught</p>
              <p className="text-sm font-bold text-slate-900 mb-2">Held directly as US shares</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                An Australian investor dies holding{" "}
                <strong className="text-slate-900">US$200,000</strong> of directly-held Apple and
                Microsoft shares through a US-custody broker. Their US-situs assets are well above the
                US$60,000 exemption, so the estate is potentially liable for US estate tax on the
                roughly US$140,000 of excess, at progressive rates reaching into the high-30s percent.
                On top of the tax, the broker freezes the account and the executor must work through
                Form 706-NA and, potentially, an IRS transfer certificate before the holdings can be
                released.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Not caught</p>
              <p className="text-sm font-bold text-slate-900 mb-2">Same exposure via Australian-domiciled VGS</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Had the same investor obtained their US-share exposure by holding{" "}
                <strong className="text-slate-900">US$200,000</strong> worth of the
                Australian-domiciled VGS on the ASX, none of it would be a US-situs asset — so the US
                estate-tax bill would be <strong className="text-slate-900">zero</strong>. The
                underlying companies are largely the same; the only difference is the wrapper — an
                Australian trust instead of direct US shares. That single structural choice removes
                the entire US estate-tax exposure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-3xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">FAQ</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
            US estate tax: common questions
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-semibold text-sm text-slate-900 hover:bg-slate-100 transition-colors">
                  <span>{faq.q}</span>
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">
                    &#8964;
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-1">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related guides ─────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/global-investing", label: "Global investing hub" },
              { href: "/global-investing/etfs", label: "AU-listed ETFs (avoid US situs)" },
              { href: "/global-investing/tax/w-8ben", label: "W-8BEN & dividend tax" },
              { href: "/global-investing/tax/cgt-on-foreign-shares", label: "CGT on foreign shares" },
              { href: "/global-investing/shares/us", label: "Buy US shares directly" },
              { href: "/find-advisor", label: "Find an estate-planning adviser" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance footer ──────────────────────────────────────────── */}
      <section className="bg-slate-50 border-t border-slate-100 py-6">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} This page is general
            information about US estate tax and is not tax, legal or estate-planning advice.
            Cross-border estate planning is a complex, specialist area where situs status, the
            availability of relief, and the right structure all turn on your specific circumstances.
            Consult a registered tax agent and an estate-planning lawyer with US cross-border
            experience before acting.
          </p>
        </div>
      </section>
    </div>
  );
}
