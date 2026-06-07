import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Annuity vs Account-Based Pension — Which Is Right for You? (${CURRENT_YEAR}) | invest.com.au`,
  description: `Head-to-head: lifetime annuity vs account-based pension for Australian retirees. Centrelink assets test, longevity risk, flexibility, fees, and the case for combining both. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Annuity vs Account-Based Pension (${CURRENT_YEAR})`,
    description: "Lifetime annuity vs ABP for Australian retirees: Centrelink, longevity, flexibility, and fees compared.",
    url: `${SITE_URL}/retirement/annuities-vs-abp`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Annuity vs ABP Australia")}&sub=${encodeURIComponent("Lifetime Annuity · ABP · Centrelink · Longevity · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/retirement/annuities-vs-abp` },
};

const COMPARISON_ROWS = [
  { feature: "Income certainty", annuity: "Guaranteed — cannot run out regardless of market or longevity", abp: "Depends on drawdown rate and investment returns — can deplete" },
  { feature: "Centrelink assets test", annuity: "60% of purchase price counted (first 5 years); 30% after — major advantage", abp: "100% of balance counted — full taper applies" },
  { feature: "Investment returns", annuity: "Fixed at contract rate — no upside if markets rally", abp: "Full investment return captured — growth stays in your account" },
  { feature: "Access to capital", annuity: "None (for lifetime annuity) — lump sum is irrevocable", abp: "Full access — can withdraw lump sums at any time" },
  { feature: "Inflation protection", annuity: "Optional CPI-indexing available but reduces payment rate", abp: "Returns can outpace inflation; no explicit protection" },
  { feature: "Estate / estate planning", annuity: "Reversionary pension to spouse; death benefit guarantee period available — but lump sum doesn&apos;t pass on", abp: "Residual balance passes to estate / beneficiaries" },
  { feature: "Fees", annuity: "Hidden in the quoted rate (lower payout reflects insurer margin)", abp: "Explicit MER/admin fee — typically 0.15–0.8% p.a. on the balance" },
  { feature: "Minimum drawdown", annuity: "N/A — insurer pays the contracted amount", abp: "ATO age-based minimums (4%–14% depending on age)" },
  { feature: "Flexibility", annuity: "Very low — once purchased, terms are fixed", abp: "High — change investment mix, withdraw extra, stop/start drawdown" },
];

const FAQS = [
  {
    q: "When is a lifetime annuity clearly better than an ABP?",
    a: "Three situations where annuities clearly outperform ABPs: (1) Centrelink optimisation — if your assets are near the Age Pension taper zone, converting $200k–$500k from ABP to annuity can restore partial or full Age Pension, worth thousands per year in additional income. (2) Longevity insurance — if you expect to live beyond 90 and worry about depleting your super, the certainty of a lifetime annuity beats the uncertainty of drawdown. (3) Simplicity — some retirees want predictable income without managing an investment portfolio. For most retirees, the answer isn't either/or: use an annuity for base-income certainty and an ABP for discretionary spending and flexibility.",
  },
  {
    q: "What is the annuity trap?",
    a: "The main risk with lifetime annuities is purchasing at a low interest rate environment (low payout rates) and then experiencing rising rates — your fixed payout looks poor compared to what you'd earn in a later purchase. Additionally: (1) No access to capital in an emergency; (2) Inflation erodes real purchasing power of non-indexed annuities; (3) If you die early, the insurer retains your capital (though reversionary options and death benefit periods mitigate this). The trap is solving for certainty while underestimating inflation and opportunity cost over 20–30 years.",
  },
  {
    q: "Can I split my retirement savings between an annuity and ABP?",
    a: "Yes — and this is the approach most retirement specialists recommend. A common structure: use an annuity to cover basic living expenses (rent/rates, food, health insurance, utilities) and an ABP for discretionary spending (travel, gifts, lifestyle). This &apos;flooring&apos; approach ensures baseline income is guaranteed while retaining flexibility for variables. The annuity portion benefits from favourable Centrelink treatment; the ABP portion captures investment returns and provides capital access. The optimal split depends on your spending breakdown and assets test situation.",
  },
  {
    q: "How does the income test interact with annuities?",
    a: "For Centrelink income test purposes, annuity income is assessed differently from ABP income. For an annuity, the &apos;deductible amount&apos; is calculated (purchase price ÷ life expectancy) and subtracted from the annual payment — only the net amount is income-tested. An ABP is subject to &apos;deeming&apos; — the ATO applies a notional 0.25%/2.25% rate to the balance regardless of actual earnings. For retirees receiving large ABP drawdowns, the deemed income may be less than actual withdrawals — which is an advantage. For annuity recipients, the deductible amount often makes annuity income Centrelink-efficient. Modelling both tests simultaneously requires specialist software.",
  },
];

export default function AnnuitiesVsAbpPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Annuity vs ABP" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
            <Link href="/retirement" className="hover:text-slate-900">Retirement</Link><span>/</span>
            <span className="text-slate-900 font-medium">Annuity vs ABP</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Lifetime annuity vs account-based pension: which is right for you?
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            The Centrelink assets test advantage of annuities can be worth $10,000–$30,000/year for
            retirees near the threshold. But ABPs retain investment upside and capital access that
            annuities can&apos;t match. Here&apos;s how to choose — and why most retirees should use both.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Head-to-head comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="Lifetime annuity vs account-based pension head-to-head comparison">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Feature</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Lifetime annuity</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Account-based pension</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{row.feature}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 leading-relaxed">{row.annuity}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 leading-relaxed">{row.abp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* The combination approach */}
      <section className="py-8 border-b border-slate-100 bg-emerald-50">
        <div className="container-custom max-w-4xl">
          <div className="flex gap-4">
            <span className="text-2xl shrink-0" aria-hidden>💡</span>
            <div>
              <p className="font-bold text-slate-900 mb-1">The &quot;flooring&quot; approach: annuity + ABP combined</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Most financial planners recommend a combination strategy: use an annuity (or DLA) to cover essential baseline expenses, and an ABP for discretionary spending. Example: a couple retiring at 67 with $700,000 puts $200,000 into a lifetime annuity (generating ~$12,000/year guaranteed) and $500,000 into an ABP. The annuity + partial Age Pension covers essential costs; the ABP covers travel and lifestyle. As the ABP depletes, the Age Pension increases — an automatic floor that prevents the annuity from being the only income source.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/retirement/annuities", label: "Annuities explained" },
              { href: "/retirement/pension-phase", label: "Account-based pension (ABP)" },
              { href: "/retirement/age-pension", label: "Age pension & assets test" },
              { href: "/retirement/how-much-do-you-need", label: "How much do I need?" },
              { href: "/retirement", label: "Retirement hub" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Annuity rates, Centrelink rules, and super regulations change. This page is general information only; it is not financial advice. Choosing between annuities and ABPs is a complex, personalised decision. Consult a licensed financial adviser before making retirement income decisions.
          </p>
        </div>
      </section>
    </div>
  );
}
