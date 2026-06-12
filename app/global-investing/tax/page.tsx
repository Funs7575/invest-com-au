import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import type { FaqItem } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Tax on International Investing for Australians (${CURRENT_YEAR}) | invest.com.au`,
  description: `Tax on foreign shares and ETFs for Australian residents: worldwide income, withholding tax, FITO, AUD CGT, W-8BEN, and US estate tax. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Tax on International Investing for Australians (${CURRENT_YEAR})`,
    description:
      "Worldwide income, withholding tax, FITO, CGT in AUD, W-8BEN and US estate tax — the tax rules every Australian investing overseas needs to understand.",
    url: `${SITE_URL}/global-investing/tax`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Tax on International Investing")}&sub=${encodeURIComponent("Withholding · FITO · CGT in AUD · US Estate Tax · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/tax` },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const HERO_LINKS = [
  { href: "/global-investing/tax/fito", label: "How FITO works" },
  { href: "/global-investing/tax/w-8ben", label: "Lodge a W-8BEN" },
  { href: "/global-investing/tax/cgt-on-foreign-shares", label: "CGT in AUD" },
  { href: "/global-investing/tax/us-estate-tax", label: "US estate tax" },
];

const HERO_STATS = [
  { value: "15%", label: "US dividend withholding", sub: "With a W-8BEN (else 30%)" },
  { value: "50%", label: "CGT discount", sub: "On gains held 12+ months" },
  { value: "$1,000", label: "FITO simplified method", sub: "Claim without detailed calc" },
  { value: "US$60k", label: "US estate-tax threshold", sub: "For US-situs assets at death" },
];

const TAX_PILLARS = [
  {
    pillar: "Withholding tax",
    what: "A foreign country deducts tax on your dividends at source, before the money reaches you.",
    detail: "The US withholds 15% on dividends once you lodge a W-8BEN (30% without it). Rates vary by country and treaty.",
    accent: "border-blue-200",
    tag: "At source",
    tagColor: "bg-blue-100 text-blue-700",
  },
  {
    pillar: "Foreign Income Tax Offset (FITO)",
    what: "A credit for the foreign tax you have already paid, which reduces your Australian tax on the same income.",
    detail: "Prevents double taxation. It can reduce your Australian tax to zero on that income, but it cannot create a refund.",
    accent: "border-emerald-200",
    tag: "Credit",
    tagColor: "bg-emerald-100 text-emerald-700",
  },
  {
    pillar: "CGT on foreign shares",
    what: "Capital gains on overseas shares are taxed in Australian dollars, not the foreign currency.",
    detail: "The 50% CGT discount applies after 12 months. Currency movement between buy and sell is part of your AUD gain.",
    accent: "border-amber-200",
    tag: "In AUD",
    tagColor: "bg-amber-100 text-amber-800",
  },
  {
    pillar: "US estate tax",
    what: "US-situs assets above US$60,000 can attract US estate tax of up to 40% when an Australian dies.",
    detail: "Applies to direct US-listed shares held via foreign brokers. Australian-domiciled ETFs sidestep it entirely.",
    accent: "border-red-200",
    tag: "On death",
    tagColor: "bg-red-100 text-red-700",
  },
];

const RESIDENCY_TESTS = [
  {
    test: "Resides test",
    desc: "The primary test. If you ordinarily reside in Australia — your home, family, and daily life are here — you are a tax resident, and the other tests do not need to be considered.",
  },
  {
    test: "Domicile test",
    desc: "If your permanent home (domicile) is in Australia, you are a resident unless the ATO is satisfied your permanent place of abode is overseas.",
  },
  {
    test: "183-day test",
    desc: "If you are physically present in Australia for 183 days or more in an income year, you are generally a resident — unless your usual home is abroad and you do not intend to take up residence here.",
  },
];

const WITHHOLDING_RATES = [
  { country: "United States", dividends: "15% (W-8BEN) / 30% (none)", treaty: "Yes", note: "Lodge a W-8BEN with your broker to claim the 15% treaty rate." },
  { country: "United Kingdom", dividends: "0%", treaty: "Yes", note: "The UK does not withhold tax on dividends paid to non-residents." },
  { country: "Japan", dividends: "10%", treaty: "Yes", note: "Treaty rate of 10% applies to most portfolio dividends." },
  { country: "Canada", dividends: "15%", treaty: "Yes", note: "Standard 15% treaty rate on dividends to Australian residents." },
  { country: "Germany", dividends: "15%", treaty: "Yes", note: "Treaty rate of 15%; reclaiming withheld German tax can be slow." },
  { country: "France", dividends: "15%", treaty: "Yes", note: "Treaty rate of 15% on portfolio dividends." },
  { country: "Switzerland", dividends: "15%", treaty: "Yes", note: "Default withholding is 35%; a partial reclaim brings it to 15%." },
  { country: "New Zealand", dividends: "15%", treaty: "Yes", note: "Supplementary dividend (imputation) rules can reduce the effective rate." },
];

const FITO_EXAMPLE = [
  { label: "Foreign dividends received (gross)", value: "$5,000" },
  { label: "Foreign tax withheld at source", value: "$750" },
  { label: "Australian tax on $5,000 at 34.5%", value: "$1,725" },
  { label: "Less FITO (credit for foreign tax)", value: "−$750", credit: true },
  { label: "Net Australian tax payable", value: "$975", total: true },
];

const RECORD_KEEPING = [
  {
    title: "Transaction-date exchange rates",
    desc: "Record the AUD/foreign-currency rate on each buy and sell date. The ATO accepts the RBA daily rates, and consistency matters — pick one source and stick to it.",
  },
  {
    title: "Dividend statements with foreign tax withheld",
    desc: "Keep statements that show both the gross dividend and the foreign tax deducted. The withheld amount is what you claim under the FITO.",
  },
  {
    title: "Brokerage records in foreign currency and AUD",
    desc: "Retain contract notes showing the trade in its native currency, plus your AUD conversion. Brokerage and FX spreads form part of your cost base.",
  },
  {
    title: "AMMA statements for international ETFs",
    desc: "Australian-domiciled ETFs issue an annual AMMA (Attribution Managed Investment Trust Member Annual) statement that summarises distributions, foreign income, and FITO amounts in AUD.",
  },
];

const ETF_SIMPLICITY = [
  {
    title: "Australian-domiciled ETFs (VGS, VGAD)",
    border: "border-emerald-200",
    points: [
      "Foreign withholding and FITO handled inside the fund.",
      "Distributions and gains reported in AUD on one statement.",
      "No W-8BEN to lodge or renew.",
      "Not a US-situs asset — no US estate-tax exposure.",
      "Far less personal record-keeping.",
    ],
  },
  {
    title: "Direct foreign shares (the trade-off)",
    border: "border-slate-200",
    points: [
      "Stronger, direct ownership and full control over holdings.",
      "You manage W-8BEN, AUD cost base, and the FITO yourself.",
      "Potential US estate-tax exposure above US$60,000.",
      "More paperwork, but access to specific stocks an ETF will not hold.",
      "Can be cheaper to trade frequently on low-FX brokers.",
    ],
  },
];

const TOPIC_CARDS = [
  {
    href: "/global-investing/tax/w-8ben",
    label: "The W-8BEN form",
    desc: "Reduce US dividend withholding from 30% to 15%. How to complete it and when it expires.",
    color: "from-amber-50 to-white",
  },
  {
    href: "/global-investing/tax/us-estate-tax",
    label: "US estate tax",
    desc: "The US$60,000 threshold that catches Australians holding US shares directly — and how to avoid it.",
    color: "from-red-50 to-white",
  },
  {
    href: "/global-investing/tax/cgt-on-foreign-shares",
    label: "CGT on foreign shares",
    desc: "Converting to AUD, the 50% discount, and how currency movement changes your taxable gain.",
    color: "from-blue-50 to-white",
  },
  {
    href: "/global-investing/tax/fito",
    label: "Foreign Income Tax Offset",
    desc: "Claiming a credit for foreign tax paid, the $1,000 simplified method, and the FITO limit.",
    color: "from-emerald-50 to-white",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Do Australians pay tax on foreign shares?",
    a: "Yes. Australian tax residents are taxed on their worldwide income, which includes dividends, interest, and capital gains from foreign shares. You declare this income on your Australian tax return in Australian dollars. Where a foreign country has already withheld tax (such as the 15% US dividend withholding), you can usually claim a Foreign Income Tax Offset so you are not taxed twice on the same income.",
  },
  {
    q: "What is the Foreign Income Tax Offset?",
    a: "The Foreign Income Tax Offset (FITO) is a credit for foreign tax you have already paid on income that is also taxed in Australia. It directly reduces your Australian tax on that income. If you paid US$150 of US withholding tax on a dividend, you can generally offset up to A$150-equivalent against your Australian tax. The FITO can reduce your Australian tax on that income to zero, but it cannot generate a refund of foreign tax — any excess is lost.",
  },
  {
    q: "How much US withholding tax do I pay on dividends?",
    a: "If you have lodged a valid W-8BEN form with your broker, the US withholds 15% on dividends paid to Australian residents under the Australia-US tax treaty. Without a W-8BEN, the default statutory rate is 30%. The W-8BEN is free, takes a few minutes, and is valid for around three years before it must be renewed, so it is well worth completing before you buy US shares.",
  },
  {
    q: "Do I pay tax twice on international investments?",
    a: "Generally no, thanks to the Foreign Income Tax Offset and Australia's network of double tax agreements (DTAs). When a foreign country withholds tax on your income, the FITO lets you offset that foreign tax against the Australian tax on the same income, so you typically pay the higher of the two rates rather than both. For example, if 15% was withheld overseas and your Australian marginal rate is 34.5%, you effectively top up the difference in Australia rather than paying 49.5% in total.",
  },
  {
    q: "Are Australian international ETFs more tax-efficient than foreign shares?",
    a: "They are usually simpler rather than strictly cheaper. Australian-domiciled international ETFs such as VGS and VGAD handle the foreign withholding tax, the AUD conversion, and the FITO calculation for you, reporting everything on a single annual tax statement. Holding US shares directly gives you stronger ownership and control but leaves you responsible for W-8BEN renewals, AUD cost-base calculations, and potential US estate-tax exposure. For most long-term investors, the ETF route removes a lot of administrative burden.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function GlobalInvestingTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Tax" },
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
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Tax</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                {UPDATED_LABEL}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
                Tax on international investing{" "}
                <span className="text-amber-500">for Australians</span>
              </h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-3">
                As an Australian tax resident, you are taxed on your{" "}
                <strong className="text-slate-900">worldwide income</strong> — including
                dividends, interest, and capital gains from overseas. That sounds daunting,
                but four concepts cover almost everything you need: withholding tax, the
                Foreign Income Tax Offset (FITO), capital gains tax calculated in AUD, and
                US estate tax.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                This hub explains each one in plain English, with a worked FITO example,
                a withholding-tax table by country, and record-keeping tips. It then links
                to detailed guides on the W-8BEN form, US estate tax, CGT on foreign shares,
                and the FITO.
              </p>

              {/* Quick-jump CTA grid */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                {HERO_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                  >
                    {l.label} &rarr;
                  </Link>
                ))}
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-3">
              {HERO_STATS.map((s) => (
                <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-xl md:text-2xl font-extrabold text-amber-600">{s.value}</div>
                  <div className="text-[0.65rem] font-bold text-slate-900 mt-0.5 leading-tight">{s.label}</div>
                  <div className="text-[0.6rem] text-slate-500 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Four tax pillars ───────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">The framework</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            The four tax pillars for global investors
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            Almost every tax question about overseas shares maps to one of these four ideas.
            Understand them once and the rest is detail.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {TAX_PILLARS.map((p) => (
              <div key={p.pillar} className={`bg-white border ${p.accent} rounded-2xl p-5`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-base font-extrabold text-slate-900">{p.pillar}</h3>
                  <span className={`shrink-0 text-[0.6rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${p.tagColor}`}>
                    {p.tag}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-2">{p.what}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{p.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Worldwide income + residency ───────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">The starting principle</p>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
                Australian residents are taxed on worldwide income
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                If you are an Australian tax resident, you must declare{" "}
                <strong className="text-slate-900">all</strong> of your income to the ATO,
                wherever it comes from. That includes foreign dividends, foreign interest,
                capital gains on overseas assets, and foreign rental income — not just what
                you earn inside Australia.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Everything is reported in Australian dollars. Where a foreign country has
                already taxed that income, the Foreign Income Tax Offset and Australia&apos;s
                double tax agreements step in to stop you being taxed twice — so the worldwide
                income rule mainly means more reporting, not a heavier overall bill. Whether
                you are a tax resident is decided by the three tests opposite; most people
                living and working here clearly satisfy the first.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-900">The three residency tests (in brief)</p>
              {RESIDENCY_TESTS.map((t) => (
                <div key={t.test} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <p className="text-sm font-bold text-slate-900 mb-1">{t.test}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{t.desc}</p>
                </div>
              ))}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-[0.65rem] text-slate-700 leading-relaxed">
                  <strong>Note:</strong> tax residency is not the same as your visa or
                  citizenship status. If your circumstances are borderline — for example,
                  you work overseas for part of the year — confirm your residency with a
                  registered tax agent before lodging.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Withholding tax by country ─────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Pillar 1 — withholding tax</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Dividend withholding tax by country
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            Many countries deduct tax on dividends before paying them to foreign investors.
            Australia&apos;s double tax agreements (DTAs) set a reduced maximum rate for
            Australian residents — but you usually have to claim it by lodging the right
            form (such as the US W-8BEN) with your broker. Without a treaty claim, the
            full statutory rate, often 30%, applies.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-xs md:text-sm" aria-label="Dividend withholding tax rates by country for Australian investors">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600">Market</th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600">Dividend withholding</th>
                  <th scope="col" className="text-center px-4 py-3 font-bold text-slate-600 hidden sm:table-cell">DTA with Australia</th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600 hidden lg:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {WITHHOLDING_RATES.map((row, i) => (
                  <tr key={row.country} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.country}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded">{row.dividends}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[0.65rem] font-bold rounded">{row.treaty}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 leading-relaxed hidden lg:table-cell max-w-md">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.65rem] text-slate-500 mt-2">
            Indicative treaty rates for Australian-resident portfolio investors as of {CURRENT_YEAR}.
            Statutory (non-treaty) rates are typically higher. Confirm with your registered tax agent.
          </p>
        </div>
      </section>

      {/* ── FITO explained ─────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Pillar 2 — FITO</p>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
                The Foreign Income Tax Offset (FITO)
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The FITO is how Australia stops you being taxed twice. When a foreign country
                withholds tax on income that Australia also taxes, you claim a credit for that
                foreign tax against your Australian tax bill on the same income.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                There are two ways to claim. Under the{" "}
                <strong className="text-slate-900">$1,000 simplified method</strong>, if your
                total foreign income tax for the year is A$1,000 or less, you can claim the
                actual amount without a detailed calculation. If your foreign tax exceeds
                A$1,000, you must work out your{" "}
                <strong className="text-slate-900">FITO limit</strong> — broadly, the Australian
                tax that would otherwise be payable on your foreign income.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Crucially, the FITO can only reduce your Australian tax to zero on that income —
                it <strong className="text-slate-900">cannot create a refund</strong>. If the
                foreign tax was higher than the Australian tax on that income, the excess is
                simply lost; it is not refunded and is not carried forward.
              </p>
              <Link
                href="/global-investing/tax/fito"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                Full FITO guide and limit calculation &rarr;
              </Link>
            </div>

            {/* Worked example */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Worked example</p>
              <p className="text-sm font-bold text-slate-900 mb-4">$5,000 of foreign dividends, $750 withheld</p>
              <div className="space-y-0 divide-y divide-emerald-200 text-sm">
                {FITO_EXAMPLE.map((line) => (
                  <div key={line.label} className="flex items-center justify-between py-2.5">
                    <span className={line.total ? "font-bold text-slate-900" : "text-slate-600"}>{line.label}</span>
                    <span className={`tabular-nums ${line.total ? "font-extrabold text-slate-900" : line.credit ? "font-bold text-emerald-700" : "font-bold text-slate-900"}`}>{line.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t-2 border-emerald-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Total tax paid (foreign + Australian)</span>
                  <span className="text-base font-extrabold text-emerald-700 tabular-nums">$1,725</span>
                </div>
                <p className="text-[0.65rem] text-slate-600 leading-relaxed mt-2">
                  The $750 already paid overseas plus the $975 paid in Australia equals $1,725 —
                  exactly the Australian tax on the income. No double tax: you simply end up
                  paying the higher Australian rate, split across two countries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CGT on foreign shares ──────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Pillar 3 — capital gains</p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
              CGT on foreign shares is calculated in AUD
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              When you sell overseas shares, the gain is worked out in{" "}
              <strong className="text-slate-900">Australian dollars</strong>, not the foreign
              currency. You convert the purchase cost to AUD using the exchange rate on the
              acquisition date, and the proceeds to AUD using the rate on the disposal date.
              This means <strong className="text-slate-900">currency movement is part of your
              gain</strong>: if a US share price is flat in USD but the AUD weakened while you
              held it, you can still have a taxable gain in AUD terms — and the reverse is also
              true. The <strong className="text-slate-900">50% CGT discount</strong> applies to
              foreign shares held more than 12 months, exactly as for Australian shares.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
              <p className="text-[0.65rem] text-slate-700 leading-relaxed">
                <strong>Tip:</strong> use the RBA daily exchange rates for conversions and keep a
                simple spreadsheet of every buy and sell with its AUD value — far easier than
                reconstructing rates years later at sale time. Brokerage and FX costs form part
                of the cost base and reduce the gain.
              </p>
            </div>
            <Link
              href="/global-investing/tax/cgt-on-foreign-shares"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
            >
              CGT on foreign shares: detail and worked examples &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── US estate tax warning ──────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-red-600 mb-1">Pillar 4 — the risk most people miss</p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
              US estate tax: a hidden trap for direct US shareholders
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                If an Australian dies holding more than{" "}
                <strong className="text-slate-900">US$60,000</strong> of US-situs assets —
                primarily US-listed shares held directly through a broker like Interactive
                Brokers, Stake, or CommSec International — the estate can face US federal
                estate tax of up to <strong className="text-slate-900">40%</strong> on the
                value above that threshold, separate from and in addition to any Australian CGT.
                The tiny US$60k exemption (versus the multi-million-dollar one US citizens
                receive) is why this catches so many Australian investors off guard.
              </p>
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                The cleanest way to avoid it entirely is to gain US-market exposure through{" "}
                <strong className="text-slate-900">Australian-domiciled ETFs</strong> (such as
                IVV or VGS) rather than holding US shares directly — an Australian-domiciled ETF
                is not a US-situs asset, so it sits outside the US estate-tax net.
              </p>
              <Link
                href="/global-investing/tax/us-estate-tax"
                className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-800"
              >
                US estate tax: full explainer and treaty relief &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── W-8BEN form ────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">The one form to lodge</p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">The W-8BEN form</h2>
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="flex-1">
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  The W-8BEN is a short US tax form that certifies you are a foreign person
                  eligible for treaty benefits. Lodging it with your broker{" "}
                  <strong className="text-slate-900">reduces US dividend withholding from 30% to
                  15%</strong> for Australian residents. It is free, takes a few minutes, and is
                  generally <strong className="text-slate-900">valid for around three years</strong>{" "}
                  before it must be renewed. Most brokers prompt you during onboarding; if it
                  lapses, they revert to the full 30% until you re-lodge.
                </p>
                <Link
                  href="/global-investing/tax/w-8ben"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                  How to complete a W-8BEN &rarr;
                </Link>
              </div>
              <div className="shrink-0 bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">Without</p>
                  <p className="text-3xl font-extrabold text-red-600 tabular-nums">30%</p>
                </div>
                <span className="text-2xl text-slate-300">&rarr;</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">With W-8BEN</p>
                  <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">15%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Record-keeping ─────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Get this right early</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Record-keeping for global investors
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            Good records make tax time straightforward and protect you if the ATO asks
            questions — and the ATO increasingly receives foreign-account data through
            international information-sharing agreements. Keep the following for every
            foreign holding.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {RECORD_KEEPING.map((r) => (
              <div key={r.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-1">{r.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ETF tax simplicity ─────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">The simpler path</p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
              Australian ETFs handle most of this for you
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Australian-domiciled international ETFs — products such as{" "}
              <strong className="text-slate-900">VGS</strong> and{" "}
              <strong className="text-slate-900">VGAD</strong> — take care of the foreign
              withholding tax, the AUD conversion, and the FITO attribution for you, then report
              it all on a single annual tax statement (an AMMA statement). You copy a few figures
              into your return rather than reconstructing exchange rates and foreign tax credits
              yourself. There is no W-8BEN to renew and no US estate-tax exposure.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {ETF_SIMPLICITY.map((col) => (
                <div key={col.title} className={`bg-white border ${col.border} rounded-2xl p-5`}>
                  <p className="text-sm font-bold text-slate-900 mb-3">{col.title}</p>
                  <ul className="text-xs text-slate-600 space-y-2 leading-relaxed list-disc list-inside">
                    {col.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mt-4">
              Neither approach is universally better — ETFs win on simplicity and estate-tax
              safety, direct shares win on control and stock selection. See the{" "}
              <Link href="/global-investing/etfs" className="text-amber-700 hover:underline font-semibold">global ETF comparison</Link>{" "}
              and the{" "}
              <Link href="/global-investing" className="text-amber-700 hover:underline font-semibold">global investing hub</Link>{" "}
              for the full picture.
            </p>
          </div>
        </div>
      </section>

      {/* ── Topic cards ────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Deep dives</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5">
            Explore each topic in detail
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {TOPIC_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className={`group block bg-gradient-to-br ${card.color} border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all`}
              >
                <p className="font-bold text-slate-900 text-sm mb-2 group-hover:text-amber-700">
                  {card.label}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-3xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">FAQ</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
            Common questions about tax on international investing
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-semibold text-sm text-slate-900 hover:bg-slate-100 transition-colors">
                  <span>{faq.q}</span>
                  <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">
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

      {/* ── Advisor CTA ─────────────────────────────────────────────────── */}
      <HubAdvisorCTA
        heading="Get international tax advice from a specialist"
        subheading="FIF rules, CGT on foreign shares, DTA credits, and controlled foreign company rules are complex. A registered tax agent with international experience can review your situation."
        intent={{ need: "tax", context: ["international_tax", "foreign_investment_tax"] }}
        source="global_investing_tax"
        ctaLabel="Find an international tax specialist"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* ── Compliance footer ───────────────────────────────────────────── */}
      <section className="bg-slate-50 border-t border-slate-200 py-6">
        <div className="container-custom">
          <p className="text-[0.65rem] text-slate-500 leading-relaxed max-w-4xl">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} This page contains
            general information about Australian tax rules for international investors. It is not
            tax advice. Tax outcomes depend on your personal circumstances — consult a registered
            tax agent (TPB) for advice specific to your situation.
          </p>
        </div>
      </section>
    </div>
  );
}
