import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Franking Credits Explained (${CURRENT_YEAR}) — Australian Dividend Imputation Guide | Invest.com.au`,
  description: `How Australian franking credits work: grossing-up formula, tax refunds for SMSFs, ETF pass-through, DRP treatment, and how to report on your tax return. ${UPDATED_LABEL}.`,
  alternates: { canonical: `${SITE_URL}/dividends/franking-credits` },
  openGraph: {
    title: `Franking Credits Explained (${CURRENT_YEAR}) — Australian Dividend Imputation`,
    description:
      "Grossing-up formula, SMSF refunds, ETF franking pass-through, DRP treatment, and tax return reporting — plain-English guide for Australian investors.",
    url: `${SITE_URL}/dividends/franking-credits`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Franking Credits Australia")}&sub=${encodeURIComponent("Dividend Imputation · Cash Refunds · SMSF · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

// ─── Static data ─────────────────────────────────────────────────────────────

const FRANKING_IMPACT_ROWS = [
  {
    type: "Fully franked",
    cash: "$1,000",
    credit: "$428.57",
    grossed: "$1,428.57",
    taxAt32: "$464.29",
    netTax: "$35.71 payable",
    colour: "text-amber-700",
  },
  {
    type: "50% franked",
    cash: "$1,000",
    credit: "$214.29",
    grossed: "$1,214.29",
    taxAt32: "$394.64",
    netTax: "$180.36 payable",
    colour: "text-slate-700",
  },
  {
    type: "Unfranked",
    cash: "$1,000",
    credit: "$0",
    grossed: "$1,000",
    taxAt32: "$325.00",
    netTax: "$325.00 payable",
    colour: "text-red-700",
  },
];

const FAQS = [
  {
    q: "How do I calculate my franking credit refund?",
    a: "Add up all franking credits shown on your dividend statements for the year. Then calculate your total income tax liability (including the grossed-up dividends in your assessable income). If your tax liability is less than the total franking credits, the ATO refunds the difference in cash. Example: $4,000 in tax credits and $1,500 in income tax liability means a $2,500 cash refund from the ATO.",
  },
  {
    q: "Do I get a refund if my franking credits exceed my tax?",
    a: "Yes — Australian residents whose total franking credits exceed their total income tax liability receive the excess as a direct cash refund from the ATO. This is called a 'refundable tax offset.' It applies to individuals, complying superannuation funds (including SMSFs), and certain other entities. Non-residents and most companies cannot access the refund.",
  },
  {
    q: "Are ETF distributions franked?",
    a: "Many Australian equity ETFs pass franking credits through to investors. For example, broad ASX ETFs like VAS, A200, and IOZ hold large positions in Australian banks and mining companies that pay heavily franked dividends. The franking rate varies year to year — check the fund's annual tax statement (AMMA statement) for your exact franking credit entitlement. Index funds holding international shares generally have no franking credits.",
  },
  {
    q: "Do international shares pay franking credits?",
    a: "No. Franking credits are specific to Australian company tax — only corporate tax paid to the Australian Tax Office can be credited to the franking account. Dividends from US, UK, European or Asian companies carry no franking credits. Some companies with partial Australian earnings and partial foreign earnings may pay partially franked dividends, but purely international companies pay unfranked dividends.",
  },
  {
    q: "How do franking credits work in a SMSF?",
    a: "An SMSF in accumulation phase pays 15% tax on income, so it can use franking credits to offset that 15% liability and often receives a partial cash refund. An SMSF in pension phase (paying Account-Based Pensions) pays 0% tax on earnings — it has no tax liability at all, so it receives the full value of every franking credit attached to its dividends as a direct ATO cash refund. This is one of the primary reasons franked Australian shares are popular in SMSF pension strategies.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FrankingCreditsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Dividends", url: `${SITE_URL}/dividends` },
    { name: "Franking Credits", url: `${SITE_URL}/dividends/franking-credits` },
  ]);
  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ── Hero ── */}
      <section className="bg-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-400 mb-5 flex-wrap"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="text-slate-600">/</span>
            <Link href="/dividends" className="hover:text-white">
              Dividends
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium">Franking Credits</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
            Dividend Imputation Guide &middot; {UPDATED_LABEL}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
            Franking Credits Explained{" "}
            <span className="text-amber-400">({CURRENT_YEAR})</span>
          </h1>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl">
            Australia&apos;s dividend imputation system is one of the most generous in the world.
            Here&apos;s how franking credits reduce your tax — and sometimes trigger a cash refund
            from the ATO.
          </p>
        </div>
      </section>

      {/* ── Key stats ── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                Corporate Tax Rate
              </p>
              <p className="text-xl font-black text-amber-700">30% / 25%</p>
              <p className="text-xs text-slate-600 mt-1">
                Standard rate 30%; base-rate entities (small companies) pay 25%. Both generate
                franking credits.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Franking Credit on $1,000
              </p>
              <p className="text-xl font-black text-slate-900">$428.57</p>
              <p className="text-xs text-slate-600 mt-1">
                At the 30% corporate rate; grossed-up assessable income = $1,428.57.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-200 p-5">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">
                SMSF Pension Phase Refund
              </p>
              <p className="text-xl font-black text-emerald-700">100%</p>
              <p className="text-xs text-slate-600 mt-1">
                A pension-phase SMSF pays 0% tax — every dollar of franking credit comes back as
                an ATO cash refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What is dividend imputation ── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            What is dividend imputation?
          </h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            Most countries tax corporate profits twice: once at the company level, then again when
            dividends are paid to shareholders. Australia&apos;s dividend imputation system, introduced in
            1987, eliminates this double-taxation for Australian residents. When an Australian
            company pays tax to the ATO, it can attach a &ldquo;franking credit&rdquo; to its
            dividends representing the tax already paid. Shareholders then get credit for that
            pre-paid tax against their own income tax liability.
          </p>
          <p className="text-slate-700 leading-relaxed mb-4">
            Very few countries operate a full imputation system. New Zealand does; the UK, US,
            and most of Europe do not. This makes Australian equities unusually attractive for
            domestic investors — particularly retirees and SMSFs — whose effective tax rates are
            below the corporate rate.
          </p>
          <p className="text-slate-700 leading-relaxed">
            The key concept is &ldquo;grossing up&rdquo;: you add the franking credit back to the
            cash dividend to get the pre-tax equivalent (&ldquo;grossed-up dividend&rdquo;), calculate
            tax on that amount at your marginal rate, then subtract the franking credit as an
            offset. If the offset exceeds your tax liability, you receive the balance as a cash
            refund.
          </p>
        </div>
      </section>

      {/* ── How franking works step by step ── */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            How franking works — step by step
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            Follow a $100 company profit through to a shareholder&apos;s tax return.
          </p>

          <ol className="space-y-5">
            {[
              {
                step: "1",
                label: "Company earns profit",
                body: "A company earns $100 in taxable profit. At the 30% corporate rate it pays $30 in company tax to the ATO, leaving $70 after-tax profit.",
              },
              {
                step: "2",
                label: "Dividend paid with franking credit attached",
                body: "The company pays the full $70 as a cash dividend. Attached to that dividend is a $30 franking credit — the tax it already paid on your behalf. Your dividend statement shows: cash $70, franking credit $30.",
              },
              {
                step: "3",
                label: "Gross up the dividend",
                body: "You add the franking credit to the cash dividend: $70 + $30 = $100 grossed-up dividend. This $100 is what you include as assessable income in your tax return (not just the $70 cash received).",
              },
              {
                step: "4",
                label: "Calculate tax at your marginal rate",
                body: "Say your marginal rate is 32.5%. Tax on $100 grossed-up dividend = $32.50.",
              },
              {
                step: "5",
                label: "Apply the franking credit as an offset",
                body: "Offset the $32.50 tax by the $30 franking credit. Net tax payable = $2.50. If your rate were below 30%, the credit would exceed your tax — the ATO refunds the difference.",
              },
            ].map(({ step, label, body }) => (
              <li key={step} className="flex gap-4">
                <div className="shrink-0 w-9 h-9 rounded-full bg-amber-500 text-slate-900 font-black text-sm flex items-center justify-center">
                  {step}
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm mb-1">{label}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Franking credit formula ── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            The franking credit formula
          </h2>
          <p className="text-slate-700 leading-relaxed mb-6">
            To calculate the franking credit attached to any fully-franked dividend, use:
          </p>

          <div className="bg-slate-900 text-white rounded-2xl p-6 mb-6 font-mono text-sm">
            <p className="text-amber-400 font-bold mb-2">Franking credit formula</p>
            <p>
              Franking Credit = Dividend &divide; (1 &minus; Company Tax Rate) &times; Company Tax
              Rate
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
            <p className="font-extrabold text-amber-900 mb-3">
              Worked example — $1,000 fully franked dividend at 30% company tax
            </p>
            <ul className="space-y-2 text-sm text-slate-800">
              <li>
                <span className="font-bold">Franking credit</span> = $1,000 &divide; (1 &minus;
                0.30) &times; 0.30 = $1,000 &divide; 0.70 &times; 0.30 ={" "}
                <span className="font-bold text-amber-700">$428.57</span>
              </li>
              <li>
                <span className="font-bold">Grossed-up assessable income</span> = $1,000 +
                $428.57 ={" "}
                <span className="font-bold text-amber-700">$1,428.57</span>
              </li>
              <li>
                <span className="font-bold">Tax at 32.5% marginal rate</span> = $1,428.57 &times;
                32.5% = $464.29
              </li>
              <li>
                <span className="font-bold">Less franking credit offset</span> = &minus;$428.57
              </li>
              <li>
                <span className="font-bold">Net tax on dividend</span> ={" "}
                <span className="font-bold text-slate-900">$35.71</span> (effectively only 2.5%
                above the 30% already paid)
              </li>
            </ul>
          </div>

          <p className="text-sm text-slate-600">
            For base-rate entity dividends (25% company tax), substitute 0.25 for 0.30. A $1,000
            fully franked dividend from a small company carries a $333.33 franking credit and a
            grossed-up amount of $1,333.33.
          </p>
        </div>
      </section>

      {/* ── Fully franked vs partial vs unfranked ── */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            Fully franked vs partially franked vs unfranked
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Not every dividend is fully franked. The degree of franking depends on how much
            Australian corporate tax the company has available in its franking account.
          </p>

          <div className="space-y-4 mb-8">
            <div className="bg-white rounded-xl border border-emerald-200 p-5">
              <h3 className="font-extrabold text-emerald-900 mb-2">Fully franked (100%)</h3>
              <p className="text-sm text-slate-700">
                The company has paid sufficient Australian tax to frank the entire dividend. Most
                large ASX-listed banks (CBA, Westpac, ANZ, NAB), BHP, and major retailers pay
                fully franked dividends. These carry the maximum tax benefit for Australian
                resident investors.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-5">
              <h3 className="font-extrabold text-amber-900 mb-2">Partially franked</h3>
              <p className="text-sm text-slate-700 mb-2">
                A partial franking credit attaches to only part of the dividend. This happens when
                a company has insufficient franking credits in its franking account — typically
                because of:
              </p>
              <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                <li>Prior-year tax losses that reduced Australian tax paid</li>
                <li>
                  Significant foreign income (only Australian tax generates franking credits)
                </li>
                <li>Accelerated depreciation or other deductions reducing taxable income</li>
                <li>A dividend paid larger than the franking account balance permits</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-5">
              <h3 className="font-extrabold text-red-900 mb-2">Unfranked (0%)</h3>
              <p className="text-sm text-slate-700">
                No franking credit attaches. Common for Real Estate Investment Trusts (REITs) —
                whose income is largely rental income not subject to corporate tax — and listed
                investment companies with primarily foreign holdings. Unfranked dividends are taxed
                in full at your marginal rate with no offset.
              </p>
            </div>
          </div>

          <h3 className="font-extrabold text-slate-900 mb-3 text-lg">
            Tax impact for a 32.5% marginal-rate investor — $1,000 dividend
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm" aria-label="Tax impact of franking credits — $1,000 dividend at 32.5% marginal rate by franking level">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-bold text-xs">Dividend type</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold text-xs">Cash received</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold text-xs">Franking credit</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold text-xs">Grossed-up income</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold text-xs">Tax at 32.5%</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold text-xs">Net tax outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FRANKING_IMPACT_ROWS.map((row) => (
                  <tr key={row.type} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{row.type}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.cash}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.credit}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.grossed}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.taxAt32}</td>
                    <td className={`px-4 py-3 text-right font-bold ${row.colour}`}>
                      {row.netTax}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Excludes Medicare Levy. Verify current rates with the ATO.
          </p>
        </div>
      </section>

      {/* ── Tax refunds for low-income earners and retirees ── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            Tax refunds for low-income earners and retirees
          </h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            Since 2000, Australia has made franking credits fully &ldquo;refundable&rdquo;. If your
            total income tax liability for the year is less than the franking credits you received,
            the ATO pays you the difference in cash — you don&apos;t just lose the unused credit.
          </p>
          <p className="text-slate-700 leading-relaxed mb-6">
            This is one of the most powerful features of the Australian tax system for investors
            with low taxable incomes, including retired shareholders living off portfolio income.
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-6">
            <p className="font-extrabold text-emerald-900 mb-3">
              Worked example — retiree on $30,000 income with $5,000 in franking credits
            </p>
            <ul className="space-y-2 text-sm text-slate-800">
              <li>
                Base income (pension + interest): <span className="font-bold">$30,000</span>
              </li>
              <li>
                Grossed-up dividends included in assessable income: adds approximately{" "}
                <span className="font-bold">$5,000</span> (the franking credits alone)
              </li>
              <li>
                Total assessable income: approximately{" "}
                <span className="font-bold">$35,000</span>
              </li>
              <li>
                Income tax on $35,000 (at 2025&ndash;26 rates, low-income offset applied):{" "}
                <span className="font-bold">approx. $2,892</span>
              </li>
              <li>
                Franking credits available as offset:{" "}
                <span className="font-bold text-emerald-700">$5,000</span>
              </li>
              <li>
                ATO cash refund: $5,000 &minus; $2,892 ={" "}
                <span className="font-extrabold text-emerald-800 text-base">$2,108</span>
              </li>
            </ul>
            <p className="text-xs text-slate-500 mt-3">
              Illustrative only. Individual circumstances vary. Verify with a registered tax
              agent.
            </p>
          </div>

          <p className="text-slate-700 leading-relaxed">
            This refund mechanism means that for retired Australians holding fully-franked shares,
            the effective dividend yield is substantially higher than the headline figure. A 5%
            fully-franked dividend can be worth considerably more after accounting for the ATO
            refund on top.
          </p>
        </div>
      </section>

      {/* ── Super funds and franking credits ── */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            Super funds and franking credits
          </h2>
          <p className="text-slate-700 leading-relaxed mb-6">
            The interaction between franking credits and superannuation is particularly powerful —
            and is one reason Australian equities dominate many SMSF portfolios.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-extrabold text-slate-900 mb-2">
                Accumulation phase (15% tax)
              </h3>
              <p className="text-sm text-slate-700 mb-3">
                A super fund in accumulation phase pays 15% tax on contributions and earnings,
                including investment income. Against this 15% tax liability, franking credits can
                be offset dollar-for-dollar. Since the corporate tax rate (30%) exceeds the super
                fund&apos;s 15% rate, excess franking credits are refunded.
              </p>
              <p className="text-sm font-bold text-slate-900">
                A $428.57 franking credit on a $1,000 dividend: 15% tax = $214.29, leaving a{" "}
                <span className="text-emerald-700">$214.28 refund</span>.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-5">
              <h3 className="font-extrabold text-emerald-900 mb-2">
                Pension phase (0% tax)
              </h3>
              <p className="text-sm text-slate-700 mb-3">
                Once a super fund commences paying an Account-Based Pension from a pension account,
                the earnings on assets supporting that pension are tax-free (0% tax rate). This
                means the fund has zero income tax liability — and therefore receives the entire
                value of every franking credit as a direct ATO cash refund.
              </p>
              <p className="text-sm font-bold text-emerald-800">
                A $428.57 franking credit on a $1,000 dividend: 0% tax, so the full{" "}
                <span className="text-emerald-700">$428.57 is refunded</span> — a 42.86% bonus
                return on top of the cash dividend.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <p className="font-bold mb-1">Why this matters for SMSF strategy</p>
            <p>
              An SMSF in full pension phase earning $50,000 in fully franked dividends would
              receive approximately $21,429 in additional ATO refunds annually — purely from
              the franking credit refund mechanism. This substantially boosts the after-tax
              yield of Australian equity holdings compared to any unfranked alternative. It is
              also why politically proposed changes to franking credit refunds attract intense
              attention from the SMSF community.
            </p>
          </div>
        </div>
      </section>

      {/* ── Dividend Reinvestment Plans ── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            Dividend Reinvestment Plans (DRP) and franking credits
          </h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            Many ASX-listed companies offer Dividend Reinvestment Plans (DRPs), allowing
            shareholders to receive additional shares instead of a cash dividend. Choosing a DRP
            does not allow you to avoid tax on the dividend.
          </p>
          <p className="text-slate-700 leading-relaxed mb-4">
            Even if you elect to take shares rather than cash, the ATO treats the full grossed-up
            dividend as assessable income in the year it is paid. You still report the grossed-up
            amount in your tax return, and you still receive — and can use — the franking credit as
            an offset.
          </p>
          <p className="text-slate-700 leading-relaxed mb-4">
            The cost base of the new shares acquired under the DRP is the dividend value at the
            DRP issue price. This is important for future CGT calculations when those shares are
            eventually sold. Your share registry&apos;s annual statement (or your broker&apos;s
            tax summary) should record these cost base events automatically.
          </p>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-sm text-slate-700">
            <p className="font-bold text-slate-900 mb-2">DRP example</p>
            <p>
              You are owed a $700 fully-franked cash dividend ($300 franking credit, $1,000
              grossed-up). You elect DRP. The company issues you shares at $5.00 each — you receive
              140 new shares. Your assessable income includes $1,000 grossed-up. You can claim the
              $300 franking credit offset. The 140 new shares have a cost base of $700 (the cash
              equivalent of the dividend at the DRP price).
            </p>
          </div>
        </div>
      </section>

      {/* ── ETF franking pass-through ── */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            ETF franking pass-through
          </h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            Exchange Traded Funds (ETFs) that hold Australian equities receive franked dividends
            from their portfolio companies. Managed investment trusts (the legal structure for
            most ETFs) are required to pass the benefit of franking credits through to investors.
            You receive a proportionate share of the total franking credits collected by the fund
            during the year.
          </p>
          <p className="text-slate-700 leading-relaxed mb-4">
            Broad ASX equity ETFs — such as Vanguard&apos;s VAS, Betashares&apos; A200, and
            iShares&apos; IOZ — hold large positions in Australian banks and mining companies that
            pay heavily franked dividends. These ETFs typically pass through meaningful franking
            credits each year, with an effective average franking rate of 60&ndash;80% across the
            distribution depending on portfolio composition.
          </p>
          <p className="text-slate-700 leading-relaxed mb-4">
            To find your exact entitlement, check the fund&apos;s annual AMMA (Attribution Managed
            Investment Trust Member Annual) statement, which your ETF provider issues after 30 June
            each year. This statement breaks down the distribution into cash income, capital gains
            components, and franking credits — all of which you report separately in your tax
            return.
          </p>
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm text-slate-700">
            <p className="font-bold text-slate-900 mb-2">Note on international ETFs</p>
            <p>
              ETFs holding primarily international shares (US equity ETFs, global bond ETFs, etc.)
              generally pass through no franking credits, because the underlying companies do not
              pay Australian corporate tax. Only the Australian-domiciled shares in a portfolio
              generate franking credits.
            </p>
          </div>
        </div>
      </section>

      {/* ── The franking account ── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            The franking account — how companies track available credits
          </h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            Every Australian company that pays corporate tax must maintain a franking account — a
            notional running balance that tracks the pool of franking credits available to attach
            to future dividends.
          </p>
          <p className="text-slate-700 leading-relaxed mb-4">
            The franking account is credited when the company pays income tax instalments to the
            ATO, and debited when franked dividends are paid to shareholders. Only Australian
            income tax paid to the Australian Tax Office generates credits — foreign tax, state
            taxes, and GST do not.
          </p>
          <p className="text-slate-700 leading-relaxed mb-4">
            If a company pays out more franking credits than its account balance, the ATO imposes
            a franking deficit tax (FDT) — a penalty equal to the shortfall multiplied by the
            corporate rate. This is why companies are careful not to over-frank dividends,
            especially when they anticipate tax refunds from the ATO (which would reduce the
            franking account).
          </p>
          <p className="text-slate-700 leading-relaxed">
            Companies with large losses, significant research and development tax offsets, or
            dividend payments that outpace their tax instalments may need to delay dividends or
            pay partially franked dividends until the franking account balance is rebuilt.
          </p>
        </div>
      </section>

      {/* ── Political risk / future of franking ── */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            The future of franking credits — political context
          </h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            The refundability of franking credits (the ability to receive a cash refund rather
            than just an offset) has been politically contested. At the 2019 federal election,
            the Australian Labor Party campaigned on ending the cash refund for franking credits
            for most shareholders — retaining the offset but removing refundability. The policy
            was not implemented following the election outcome.
          </p>
          <p className="text-slate-700 leading-relaxed mb-4">
            Since then, no major party has actively re-proposed ending refundability. The system
            as of {CURRENT_YEAR} remains as enacted: Australian resident individuals,
            complying superannuation funds, and certain other entities retain full access to the
            cash refund where credits exceed tax liability.
          </p>
          <p className="text-slate-700 leading-relaxed">
            Investors — particularly SMSFs in pension phase — should be aware that the policy
            landscape can shift. Any material change to the refundability of franking credits
            would significantly affect the after-tax returns of heavily Australian-equity-weighted
            portfolios. Investors relying on franking credit refunds as a meaningful income stream
            may wish to consider portfolio diversification as a hedge against policy risk.
          </p>
        </div>
      </section>

      {/* ── Tax return reporting ── */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            Reporting franking credits in your tax return
          </h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            Franking credits are reported at{" "}
            <span className="font-bold">Item 11 (Dividends)</span> in your individual tax return
            via the ATO&apos;s myTax. You must report the{" "}
            <span className="font-bold">grossed-up dividend amount</span> (cash plus franking
            credit) as income — not merely the cash you received in your bank account.
          </p>
          <p className="text-slate-700 leading-relaxed mb-4">
            Your dividend statement (from the share registry — Computershare, Link Market Services,
            etc.) shows three key figures: the unfranked amount, the franked amount, and the
            imputation credit (franking credit). You enter each of these figures separately in
            myTax.
          </p>
          <p className="text-slate-700 leading-relaxed mb-6">
            The ATO pre-fills dividend data from share registries for most listed securities.
            Always review the pre-filled data for accuracy — registries sometimes report in
            aggregate and the timing of year-end dividends can cause amounts to appear in the
            wrong tax year.
          </p>

          <h3 className="font-extrabold text-slate-900 mb-3 text-lg">
            Common reporting mistakes to avoid
          </h3>
          <ul className="space-y-3">
            {[
              {
                mistake: "Reporting only the cash received",
                fix: "You must include the grossed-up amount (cash + franking credit) as assessable income. Only reporting the cash means you under-report income — and the ATO&apos;s data matching will identify the discrepancy.",
              },
              {
                mistake: "Forgetting partially franked dividends still generate a credit",
                fix: "A 50%-franked dividend still carries a franking credit for the franked portion. Check every dividend statement — partial franking is worth reporting even if smaller.",
              },
              {
                mistake: "Not claiming franking credits from DRP shares",
                fix: "If you elected a Dividend Reinvestment Plan and received shares instead of cash, the dividend event still occurred and the franking credits are still available to you. These must be reported.",
              },
              {
                mistake: "Missing ETF franking credits from the AMMA statement",
                fix: "ETF distributions include a franking credit component reported on the annual AMMA statement — not just your brokerage account's 'distribution received' figure. The AMMA arrives after 30 June; wait for it before lodging.",
              },
            ].map(({ mistake, fix }) => (
              <li key={mistake} className="flex gap-3">
                <span className="shrink-0 mt-0.5 text-red-500 font-black text-sm">&#215;</span>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{mistake}</p>
                  <p
                    className="text-sm text-slate-600 mt-0.5"
                    >{fix}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
            Franking credits — common questions
          </h2>
          <div className="divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>{faq.q}</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">
                    &#9660;
                  </span>
                </summary>
                <p
                  className="mt-3 text-sm text-slate-600 leading-relaxed"
                >{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related guides CTA ── */}
      <section className="py-10 bg-white border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            Related Guides
          </p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <Link
              href="/dividends/calculator"
              className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-amber-50 hover:border-amber-300 font-bold text-slate-900 transition-colors"
            >
              Franking credit calculator &rarr;
            </Link>
            <Link
              href="/dividends"
              className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-amber-50 hover:border-amber-300 font-bold text-slate-900 transition-colors"
            >
              Dividend investing guide &rarr;
            </Link>
            <Link
              href="/tax/capital-gains"
              className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-amber-50 hover:border-amber-300 font-bold text-slate-900 transition-colors"
            >
              Capital Gains Tax guide &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance disclaimer ── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Tax information on this page is general in nature and based
            on Australian tax law as understood at {UPDATED_LABEL}. Individual tax outcomes depend
            on personal circumstances. Verify current rates and rules with the ATO (ato.gov.au) or
            a registered tax agent.
          </p>
        </div>
      </section>
    </div>
  );
}
