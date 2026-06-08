import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { DASP_WARNING, SUPER_WARNING_SHORT, GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import { createClient } from "@/lib/supabase/server";
import { getAffiliateLink, AFFILIATE_REL, renderStars } from "@/lib/tracking";
import type { Broker } from "@/lib/types";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Leaving Australia? Super Guide — DASP, Tax & NZ KiwiSaver Portability (${CURRENT_YEAR})`,
  description:
    `How to claim your Australian super when leaving Australia. DASP (Departing Australia Superannuation Payment) guide: 35% withholding tax, 65% for Working Holiday Makers, step-by-step claim process, NZ KiwiSaver portability, lost super, and SMSF rules. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Leaving Australia Super Guide — DASP & NZ Portability (${CURRENT_YEAR})`,
    description:
      "Complete guide to claiming your super when you leave Australia. DASP withholding rates, who qualifies, how to apply via the ATO portal, Working Holiday Maker rules, and trans-Tasman KiwiSaver portability.",
    url: `${SITE_URL}/super/leaving-australia`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Leaving Australia Super Guide")}&sub=${encodeURIComponent("DASP · 35% WHT · Working Holiday Makers · NZ KiwiSaver")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/super/leaving-australia` },
};

const HERO_STATS = [
  {
    label: "Standard DASP Rate",
    value: "35%",
    sub: "Withholding on the taxed element for most temporary visa holders. Applied before payment is made.",
    color: "red",
  },
  {
    label: "Working Holiday Makers",
    value: "65%",
    sub: "Special regime for 417 and 462 visa holders — the highest DASP withholding rate in Australia.",
    color: "orange",
  },
  {
    label: "Must depart first",
    value: "Overseas only",
    sub: "You must have departed Australia AND your visa must be expired or cancelled before applying.",
    color: "slate",
  },
  {
    label: "NZ Citizens",
    value: "KiwiSaver",
    sub: "NZ citizens and permanent residents can transfer AU super to KiwiSaver — avoiding DASP withholding.",
    color: "blue",
  },
];

const DASP_STEPS = [
  {
    step: 1,
    title: "Leave Australia — your visa must cease",
    detail:
      "You can only claim DASP after you have departed Australia AND your visa is cancelled or has expired. You cannot apply for DASP while you are still in Australia, or if you still hold a valid Australian visa (except where the visa is expired and you have departed). Keep your departure records (boarding pass, passport stamps) and note the exact date your visa expires or is cancelled.",
  },
  {
    step: 2,
    title: "Confirm your visa has expired or been cancelled (check VEVO)",
    detail:
      "There is a mandatory waiting period — you must wait until your visa has actually ceased (either expired or been cancelled). Check your visa status via VEVO (Visa Entitlement Verification Online) at homeaffairs.gov.au/Trav/Visa-1/VEVO. If you hold a visa with a future expiry date, you must wait until that date passes before applying. Working Holiday Makers: your visa is generally cancelled when you depart, so you can apply soon after leaving. Other visa types (482 TSS): the employer sponsor may need to cancel the visa — confirm the cancellation date with the Department of Home Affairs.",
  },
  {
    step: 3,
    title: "Gather your super fund details and TFN",
    detail:
      "Collect the following for each super fund you hold: fund name, ABN, member number, estimated account balance, and your contact details at your overseas address. Log into myGov before you leave Australia to get a full picture of all funds registered under your TFN. If you have lost track of a fund, you can still search via the ATO's online services using your TFN from overseas. Funds that have been inactive for five or more years may have already transferred your balance to the ATO as unclaimed super.",
  },
  {
    step: 4,
    title: "Apply online via the ATO DASP portal",
    detail:
      "Go to ato.gov.au/Individuals/Super/In-detail/Withdrawing-and-using-your-super/Departing-Australia-superannuation-payment/ and use the online application portal. You will need: Australian TFN, fund details, your passport, proof of identity, and your overseas bank account details (SWIFT/IBAN) for payment. The ATO sends the DASP request to your fund or funds. Alternatively, contact your fund directly and request their DASP form — some funds prefer their own process.",
  },
  {
    step: 5,
    title: "Your fund processes within 28 days",
    detail:
      "Your super fund has 28 days to pay the DASP claim from the date they receive it. In practice, most straightforward claims settle in 5 to 15 business days. The withholding tax is deducted by your fund before payment — you will not receive the gross amount. If you have unclaimed super held by the ATO (common when your fund closed a dormant account), that portion is processed separately via the ATO DASP portal.",
  },
  {
    step: 6,
    title: "Receive payment (net of withholding tax) to your overseas account",
    detail:
      "Your fund transfers the after-tax DASP amount directly to your nominated overseas bank account via international wire transfer. The withholding tax (35% for most visa holders on the taxed element, 65% for Working Holiday Makers) is automatically deducted — you do not need to file an Australian tax return solely for this payment, as DASP withholding is a final tax. Allow 2 to 3 business days for the international wire to settle after the fund releases the payment.",
  },
  {
    step: 7,
    title: "Check home country tax obligations",
    detail:
      "DASP withholding is final from Australia's perspective, but your home country may treat the receipt as foreign pension income and tax it again (with or without a foreign tax credit offset). The UK, USA, Canada, and most EU countries each have their own rules. Obtain local tax advice before you receive the payment — you may need to declare it on your home country tax return for the year of receipt.",
  },
];

const DASP_WITHHOLDING_RATES = [
  {
    visaType: "Working Holiday Maker (417 / 462)",
    element: "All taxable elements",
    rate: "65%",
    note: "Special regime introduced in 2017. Applies even if you later moved to another visa type.",
    highlight: true,
  },
  {
    visaType: "Other temporary visa holders (student 500, skilled 482, etc.)",
    element: "Taxed element",
    rate: "35%",
    note: "Standard rate. Applies to the overwhelming majority of employer SG contributions.",
    highlight: false,
  },
  {
    visaType: "Any temporary visa holder",
    element: "Untaxed element",
    rate: "45%",
    note: "Rare — applies mainly to some older public-sector defined benefit funds.",
    highlight: false,
  },
  {
    visaType: "Any temporary visa holder",
    element: "Tax-free element",
    rate: "0%",
    note: "After-tax personal (non-concessional) contributions. Always withheld at zero.",
    highlight: false,
  },
];

interface WorkedExample {
  label: string;
  balance: string;
  withheld: string;
  received: string;
  rate: string;
  color: string;
}

const WORKED_EXAMPLES: WorkedExample[] = [
  {
    label: "Skilled worker (482 TSS visa)",
    balance: "$50,000",
    withheld: "$17,500",
    received: "$32,500",
    rate: "35%",
    color: "blue",
  },
  {
    label: "Working Holiday Maker (417 visa)",
    balance: "$50,000",
    withheld: "$32,500",
    received: "$17,500",
    rate: "65%",
    color: "orange",
  },
];

const ELIGIBLE_VISA_TYPES = [
  { visa: "417", name: "Working Holiday", note: "65% WHT rate applies" },
  { visa: "462", name: "Work and Holiday", note: "65% WHT rate applies" },
  { visa: "482", name: "Temporary Skill Shortage (TSS)", note: "35% WHT rate applies" },
  { visa: "500", name: "Student", note: "35% WHT rate applies if SG contributions received" },
  { visa: "400", name: "Temporary Work (Short Stay)", note: "35% WHT rate applies" },
  { visa: "408", name: "Temporary Activity", note: "35% WHT rate applies" },
  { visa: "489", name: "Skilled Regional (Provisional)", note: "35% WHT rate applies" },
  { visa: "491", name: "Skilled Work Regional (Provisional)", note: "35% WHT rate applies" },
];

const NZ_PORTABILITY_COMPARISON = [
  { feature: "DASP withholding tax", dasp: "35% (or 65% WHM)", kiwisaver: "0% AU withholding" },
  { feature: "Access before retirement", dasp: "Immediately on receipt", kiwisaver: "Locked until age 65 (NZ rules)" },
  { feature: "Investment choice", dasp: "Your choice after receipt", kiwisaver: "Limited to KiwiSaver funds" },
  { feature: "Best for", dasp: "Non-NZ citizens; those who need funds now", kiwisaver: "NZ citizens staying in NZ permanently" },
  { feature: "Process", dasp: "Apply via ATO DASP portal", kiwisaver: "Apply via NZ IRD once back in NZ" },
];

const LEAVING_AU_FAQS = [
  {
    q: "Can I claim DASP before I leave Australia?",
    a: "No. DASP can only be claimed once you have physically departed Australia AND your visa has expired or been cancelled. If you are still in Australia — even with an expired visa — you cannot apply for DASP. The ATO portal will reject applications from people who have not departed. Make sure you have your departure date confirmed before applying.",
  },
  {
    q: "How long does the DASP payment take?",
    a: "Your super fund has 28 days from receiving the DASP request to make payment. In practice, most straightforward claims are processed in 5 to 15 business days. After the fund releases funds, allow 2 to 3 additional business days for the international wire transfer to reach your overseas bank account. Claims can take longer if identity verification is required, if you have multiple funds, or if your fund needs to contact you for additional information. If you have not received payment within 28 days, contact the ATO on 13 10 20.",
  },
  {
    q: "What tax rate applies to Working Holiday Maker super?",
    a: "Working Holiday Makers (subclass 417 and 462 visa holders) are subject to a special 65% DASP withholding rate on all taxable elements of their super balance. This rate was introduced in 2017 and applies regardless of how much super you accumulated, or whether you subsequently held a different visa type. For example, if you saved $20,000 in super during a working holiday, you would receive approximately $7,000 after the 65% DASP tax. This rate is controversial and has been subject to repeated advocacy for reduction, but it remains at 65% as at 2026.",
  },
  {
    q: "Can I avoid the DASP tax if I am an NZ citizen?",
    a: "Yes — NZ citizens and permanent residents with a New Zealand address can transfer their Australian super directly to a KiwiSaver account under the Trans-Tasman Retirement Savings Portability scheme, with no Australian DASP withholding tax. The transfer goes directly from your Australian fund to your KiwiSaver scheme. The downside is that the amount is then locked in KiwiSaver under New Zealand rules and generally cannot be accessed until age 65 (except for first home purchase or hardship). For NZ citizens planning to remain in New Zealand permanently, the transfer is almost always more advantageous than taking the 35% DASP haircut.",
  },
  {
    q: "What happens to my super if my fund closes my account while I am overseas?",
    a: "Super funds are required to transfer balances from inactive accounts to the ATO as 'unclaimed super money' after approximately five years of inactivity. If this happens, your money is still yours — it is held by the ATO on your behalf. You can claim it through the ATO's DASP portal in the same way you would claim from a fund. Before departing Australia, check myGov to see all funds linked to your TFN, consolidate accounts if possible, and keep at least one fund informed of your overseas address to avoid the inactive-account transfer.",
  },
  {
    q: "Can I claim DASP if I am on a bridging visa?",
    a: "No. Bridging visas are Australian visas — while you hold a bridging visa, you still have a valid Australian visa and do not meet the DASP eligibility requirement. You must wait until the bridging visa has expired or been cancelled (which typically happens when you depart Australia or your substantive visa is finally refused). Once your visa has fully ceased and you have departed, you can apply for DASP.",
  },
  {
    q: "Is DASP taxed again in my home country?",
    a: "It depends entirely on your home country's tax rules. Australia treats DASP withholding as a final tax — there is no further Australian tax obligation. However, your home country may classify the DASP receipt as foreign pension or superannuation income and tax it accordingly. Some countries apply a foreign tax credit to offset the Australian withholding, which can reduce double taxation. Countries with different rules include the UK (may treat it as a foreign pension lump sum), the USA (may require reporting on Form 8938), and Canada (generally taxable as foreign income). Always seek local tax advice before and after receiving a DASP payment.",
  },
  {
    q: "What if I have super in multiple funds?",
    a: "You need to claim DASP from each fund separately. The ATO's online DASP portal at ato.gov.au allows you to submit applications to multiple funds in a single session. You will need each fund's name, ABN, and your member number. If the ATO holds unclaimed super for you (because a fund transferred an inactive account to the ATO), you apply for that via the same portal. Before leaving Australia, log into myGov to see all funds registered under your TFN so you do not miss any accounts. Consolidating into one fund before departure (while you are still in Australia) simplifies the DASP process considerably.",
  },
];

export default async function LeavingAustraliaPage() {
  const supabase = await createClient();
  const { data: fxRows } = await supabase
    .from("brokers")
    .select(
      "id, name, slug, color, logo_url, rating, cta_text, benefit_cta, tagline, affiliate_url, status, platform_type, created_at, updated_at, chess_sponsored, smsf_support, is_crypto, deal, editors_pick"
    )
    .eq("status", "active")
    .eq("platform_type", "cfd_forex")
    .order("rating", { ascending: false })
    .limit(3);
  const fxProviders: Broker[] = fxRows ?? [];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Super", url: `${SITE_URL}/super` },
    { name: "Leaving Australia" },
  ]);

  const faqSchema = faqJsonLd(LEAVING_AU_FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/super" className="hover:text-slate-900">Super</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Leaving Australia</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              DASP &middot; Working Holiday &middot; NZ KiwiSaver &middot; {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Leaving Australia?{" "}
              <span className="text-amber-600">Your Super Guide &mdash; DASP &amp; NZ Portability</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Everything temporary visa holders need to know about claiming Australian super when
              departing &mdash; the DASP process, withholding rates (including the 65% Working Holiday
              Maker rate), NZ KiwiSaver portability, lost super, SMSF rules, and what happens if you
              later return to Australia.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Stat Callouts ────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HERO_STATS.map((stat) => (
              <div
                key={stat.label}
                className={`bg-white rounded-2xl border p-5 ${
                  stat.color === "red"
                    ? "border-red-200"
                    : stat.color === "orange"
                    ? "border-orange-200"
                    : stat.color === "blue"
                    ? "border-blue-200"
                    : "border-slate-200"
                }`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-wide mb-1 ${
                    stat.color === "red"
                      ? "text-red-800"
                      : stat.color === "orange"
                      ? "text-orange-800"
                      : stat.color === "blue"
                      ? "text-blue-800"
                      : "text-slate-700"
                  }`}
                >
                  {stat.label}
                </p>
                <p
                  className={`text-xl font-black ${
                    stat.color === "red"
                      ? "text-red-700"
                      : stat.color === "orange"
                      ? "text-orange-700"
                      : stat.color === "blue"
                      ? "text-blue-700"
                      : "text-slate-900"
                  }`}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASP Warning Banner ──────────────────────────────────────── */}
      <section className="py-8">
        <div className="container-custom max-w-3xl">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-5">
            <p className="text-sm font-bold text-red-900 mb-2">The DASP withholding rate is not a mistake &mdash; it&apos;s deliberately high</p>
            <p className="text-sm text-red-800 leading-relaxed">{DASP_WARNING}</p>
          </div>
        </div>
      </section>

      {/* ── Who can claim DASP ───────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Eligibility"
            title="Who can claim DASP?"
            sub="DASP is only available to former temporary visa holders who have departed Australia and whose visa has ceased."
          />
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-3">You ARE eligible if you&hellip;</p>
              <ul className="space-y-2 text-sm text-green-900">
                <li className="flex gap-2"><span className="text-green-600 shrink-0 mt-0.5">&#10003;</span>Were in Australia on a temporary visa (not permanent)</li>
                <li className="flex gap-2"><span className="text-green-600 shrink-0 mt-0.5">&#10003;</span>Have physically departed Australia</li>
                <li className="flex gap-2"><span className="text-green-600 shrink-0 mt-0.5">&#10003;</span>Your visa has expired or been cancelled</li>
                <li className="flex gap-2"><span className="text-green-600 shrink-0 mt-0.5">&#10003;</span>Are not an Australian or NZ citizen or PR</li>
                <li className="flex gap-2"><span className="text-green-600 shrink-0 mt-0.5">&#10003;</span>Had super contributions made to an Australian fund</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-3">You are NOT eligible if you&hellip;</p>
              <ul className="space-y-2 text-sm text-red-900">
                <li className="flex gap-2"><span className="text-red-600 shrink-0 mt-0.5">&#10007;</span>Are an Australian citizen or permanent resident</li>
                <li className="flex gap-2"><span className="text-red-600 shrink-0 mt-0.5">&#10007;</span>Are a New Zealand citizen (use KiwiSaver portability instead)</li>
                <li className="flex gap-2"><span className="text-red-600 shrink-0 mt-0.5">&#10007;</span>Are still physically in Australia</li>
                <li className="flex gap-2"><span className="text-red-600 shrink-0 mt-0.5">&#10007;</span>Hold any valid Australian visa (including bridging visas)</li>
                <li className="flex gap-2"><span className="text-red-600 shrink-0 mt-0.5">&#10007;</span>Are under 18 (in most circumstances)</li>
              </ul>
            </div>
          </div>

          <h3 className="text-base font-extrabold text-slate-900 mb-3">Eligible visa types</h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
            <table className="w-full text-sm" aria-label="Eligible visa types for DASP">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th scope="col" className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wide">Subclass</th>
                  <th scope="col" className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wide">Visa name</th>
                  <th scope="col" className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wide text-slate-300">DASP rate</th>
                </tr>
              </thead>
              <tbody>
                {ELIGIBLE_VISA_TYPES.map((v, i) => (
                  <tr key={v.visa} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 text-xs">{v.visa}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{v.name}</td>
                    <td className={`px-4 py-3 text-xs font-semibold ${v.note.startsWith("65%") ? "text-orange-600" : "text-blue-600"}`}>{v.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-800 mb-1">Australian citizens and permanent residents cannot claim DASP</p>
            <p className="text-sm text-amber-900 leading-relaxed">
              If you are an Australian or New Zealand citizen, or hold a permanent residency visa, you cannot
              claim DASP. Your super is preserved until you reach preservation age (currently 60 for most
              people). There is no equivalent early-exit mechanism for permanent residents who leave Australia.
            </p>
          </div>
        </div>
      </section>

      {/* ── DASP Withholding Tax ─────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Tax rates"
            title="DASP withholding tax &mdash; how much will you lose?"
            sub="Withholding rates vary by visa type and by which component ('element') of your super balance is being paid out."
          />

          <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-8">
            <table className="w-full text-sm" aria-label="DASP withholding tax rates by visa type and super element">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Visa type</th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Super element</th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-red-300">Rate</th>
                  <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-slate-400">Notes</th>
                </tr>
              </thead>
              <tbody>
                {DASP_WITHHOLDING_RATES.map((row, i) => (
                  <tr
                    key={row.visaType}
                    className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50"} ${row.highlight ? "border-l-4 border-orange-400" : ""}`}
                  >
                    <td className="px-5 py-3.5 text-slate-700 text-xs leading-relaxed font-medium">{row.visaType}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{row.element}</td>
                    <td
                      className={`px-5 py-3.5 font-black text-sm ${
                        row.rate === "65%"
                          ? "text-orange-600"
                          : row.rate === "0%"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {row.rate}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs leading-relaxed">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mb-8">Rates verified as at {UPDATED_LABEL} per ATO schedule. Subject to change by legislation.</p>

          <h3 className="text-base font-extrabold text-slate-900 mb-2">Why 65% for Working Holiday Makers?</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            The WHM rate of 65% was introduced in 2017 as part of the government&apos;s response to the
            Backpacker Tax review. The policy rationale was that WHMs receive a concessional visa allowing
            them to work in Australia, and the higher DASP rate partially offsets tax concessions
            received. The rate remains deeply controversial &mdash; tourism industry groups and international
            advocacy organisations have repeatedly called for it to be reduced &mdash; but as at {CURRENT_YEAR} it
            stands at 65%.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-8">
            Note that the WHM rate applies to the <em>entire</em> taxable super balance if you held a 417 or
            462 visa at any point during your Australian stay, even if you subsequently moved to a
            different visa type (such as a 482 TSS visa).
          </p>

          <h3 className="text-base font-extrabold text-slate-900 mb-4">Worked examples &mdash; $50,000 balance</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {WORKED_EXAMPLES.map((ex) => (
              <div
                key={ex.label}
                className={`rounded-2xl border p-5 ${
                  ex.color === "orange" ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"
                }`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-wide mb-3 ${
                    ex.color === "orange" ? "text-orange-800" : "text-blue-800"
                  }`}
                >
                  {ex.label}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Account balance</span>
                    <span className="font-bold text-slate-900">{ex.balance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">DASP tax rate</span>
                    <span className={`font-bold ${ex.color === "orange" ? "text-orange-700" : "text-blue-700"}`}>{ex.rate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax withheld</span>
                    <span className="font-bold text-red-700">{ex.withheld}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between">
                    <span className="font-bold text-slate-800">You receive</span>
                    <span className="font-black text-green-700 text-base">{ex.received}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Examples assume the entire $50,000 balance is in the taxed element (typical for employer SG
            contributions). Balances with a tax-free element (after-tax personal contributions) would have
            those contributions withheld at 0%. Figures are illustrative only.
          </p>
        </div>
      </section>

      {/* ── Step-by-Step DASP Process ────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Step-by-step"
            title="How to claim DASP &mdash; the complete process"
            sub="Complete each step in order. You cannot claim until steps 1 and 2 are complete."
          />
          <div className="space-y-4">
            {DASP_STEPS.map((s) => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-5">
                <div className="shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NZ KiwiSaver Portability ─────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="NZ Citizens"
            title="NZ citizens and KiwiSaver portability"
            sub="New Zealand citizens and permanent residents can transfer Australian super to KiwiSaver without paying DASP withholding tax."
          />
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            The Trans-Tasman Retirement Savings Portability scheme allows NZ citizens (and NZ permanent
            residents with a NZ address) to move their Australian superannuation directly into a New
            Zealand KiwiSaver account. This avoids the 35% (or 65% WHM) DASP withholding entirely &mdash;
            the full balance is transferred, subject only to a small KiwiSaver administration fee.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
            <table className="w-full text-sm" aria-label="DASP vs KiwiSaver transfer comparison">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th scope="col" className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wide">Feature</th>
                  <th scope="col" className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wide text-red-300">Take DASP</th>
                  <th scope="col" className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wide text-green-300">Transfer to KiwiSaver</th>
                </tr>
              </thead>
              <tbody>
                {NZ_PORTABILITY_COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-4 py-3 font-semibold text-slate-700 text-xs">{row.feature}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{row.dasp}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{row.kiwisaver}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">How the transfer works</p>
            <ol className="space-y-2 text-sm text-blue-900">
              <li className="flex gap-2"><span className="font-bold shrink-0">1.</span>Open a KiwiSaver account with a participating provider (most large NZ KiwiSaver funds participate).</li>
              <li className="flex gap-2"><span className="font-bold shrink-0">2.</span>Contact your Australian super fund and request a trans-Tasman transfer. Provide your KiwiSaver fund&apos;s details and your NZ IRD number.</li>
              <li className="flex gap-2"><span className="font-bold shrink-0">3.</span>Your Australian fund sends the balance directly to the KiwiSaver scheme.</li>
              <li className="flex gap-2"><span className="font-bold shrink-0">4.</span>The NZ receiving scheme may deduct a withholding amount under NZ tax rules (typically much lower than Australian DASP rates).</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-800 mb-1">Key limitation: locked until age 65</p>
            <p className="text-sm text-amber-900 leading-relaxed">
              Once transferred to KiwiSaver, the Australian super balance is governed by NZ KiwiSaver
              rules and cannot be accessed until age 65 (with limited exceptions for first home purchase
              or significant financial hardship). For NZ citizens who intend to stay in New Zealand
              permanently, this is almost always the better option. For those who may return to Australia,
              or who need the funds sooner, DASP may be the more practical choice despite the withholding tax.
            </p>
          </div>
        </div>
      </section>

      {/* ── Lost and Unclaimed Super ─────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Lost super"
            title="Lost and unclaimed super &mdash; is the ATO holding your money?"
            sub="Super funds transfer inactive accounts to the ATO after approximately five years of inactivity. The ATO currently holds around $17 billion in lost and unclaimed super."
          />
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            If you had multiple employers during your time in Australia, or if you changed addresses and
            lost contact with a fund, there is a reasonable chance that some of your super has been
            transferred to the ATO as &apos;unclaimed super money&apos;. This happens automatically when:
          </p>
          <ul className="space-y-2 text-sm text-slate-600 mb-6 ml-4">
            <li className="flex gap-2"><span className="text-slate-400 shrink-0">&bull;</span>An account has been inactive (no contributions, no rollovers, no contact) for five or more years, and</li>
            <li className="flex gap-2"><span className="text-slate-400 shrink-0">&bull;</span>The fund cannot locate you to return the money.</li>
          </ul>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">How to check (from overseas)</p>
              <ul className="space-y-1.5 text-sm text-slate-600">
                <li>1. Log in to myGov and link the ATO service</li>
                <li>2. Navigate to Super &rarr; Manage &rarr; Unclaimed super</li>
                <li>3. Or call the ATO from overseas on +61 2 6216 1111</li>
              </ul>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Claiming ATO-held super via DASP</p>
              <ul className="space-y-1.5 text-sm text-slate-600">
                <li>1. Confirm you are eligible for DASP (departed, visa ceased)</li>
                <li>2. Apply via the ATO DASP portal (same portal as fund claims)</li>
                <li>3. Select &apos;ATO-held super&apos; in the application form</li>
                <li>4. Payment processed within 28 days to your overseas account</li>
              </ul>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 leading-relaxed">
              <strong>Pro tip:</strong> Before leaving Australia, consolidate all your super into one fund
              via myGov. This prevents funds from closing inactive accounts while you are overseas,
              eliminates multiple-fund admin, and gives you a clear single target when you apply for DASP.
            </p>
          </div>
        </div>
      </section>

      {/* ── SMSF and DASP ───────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="SMSF"
            title="SMSF and DASP &mdash; special rules"
            sub="Self-Managed Super Fund members face additional complexity when claiming DASP. SMSF balances cannot be claimed directly."
          />
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            If you are a member of a Self-Managed Super Fund (SMSF), you cannot claim DASP directly
            from the SMSF. The ATO DASP portal only processes claims from APRA-regulated funds (retail
            and industry super funds). SMSF members have two main options:
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Option 1: Roll over to a retail/industry fund</p>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                Before departing (or immediately after), roll your SMSF balance into a retail or industry
                super fund. Once in an APRA-regulated fund, you can claim DASP in the normal way after you
                have departed and your visa has ceased.
              </p>
              <p className="text-xs text-slate-400">Simpler than winding up the SMSF. Fund must accept rollover from an SMSF.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Option 2: Wind up the SMSF</p>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                Wind-up the SMSF entirely: sell all fund assets, pay out benefits to members, and deregister
                the SMSF with the ATO. This is a complex, time-consuming process that typically requires an
                SMSF specialist accountant or auditor. DASP can then be claimed once the wind-up is complete
                and funds are transferred.
              </p>
              <p className="text-xs text-slate-400">More involved but may be necessary if rolling over is not possible.</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-bold text-red-800 mb-1">Seek specialist SMSF advice before departing</p>
            <p className="text-sm text-red-900 leading-relaxed">
              SMSF wind-ups and cross-border rollovers are complex and can take months. Plan well in
              advance of your intended departure date. An SMSF that is not properly wound up while you
              are overseas can incur compliance penalties. Engage an SMSF-specialist accountant or
              administrator well before you leave.
            </p>
          </div>
        </div>
      </section>

      {/* ── Tax in home country ──────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Home country tax"
            title="Tax in your home country on the DASP payment"
            sub="Australia treats DASP withholding as a final tax — but your home country may have its own rules."
          />
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Once you receive a DASP payment, you have no further Australian tax obligation on that amount.
            DASP withholding is a final tax &mdash; there is no requirement to lodge an Australian tax return
            solely because you claimed DASP.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            However, your home country may classify the DASP receipt as foreign pension or superannuation
            income and include it in your taxable income for the year. Whether a foreign tax credit applies
            to offset the Australian withholding depends on the specific tax treaty (if any) between
            Australia and your home country.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Country-specific notes</p>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex gap-3">
                <span className="font-bold text-slate-800 w-16 shrink-0">UK</span>
                <span>DASP receipts may be treated as foreign pension lump sums. UK-Australia double tax treaty provides some relief. Seek UK-based tax advice.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-slate-800 w-16 shrink-0">USA</span>
                <span>DASP may need to be reported as foreign pension income. Form 8938 (FATCA) or FBAR reporting may apply depending on balance levels. US tax law is complex in this area.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-slate-800 w-16 shrink-0">Canada</span>
                <span>Generally treated as foreign income. Canada-Australia tax treaty applies. Foreign tax credits may offset Australian withholding.</span>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-slate-800 w-16 shrink-0">EU</span>
                <span>Varies significantly by country. The EU-Australia relationship is through individual bilateral tax treaties. Check your specific country&apos;s rules.</span>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>Always obtain local tax advice</strong> in your home country before receiving a DASP
              payment. Australian tax rules do not follow you home. A tax professional in your home country
              familiar with foreign pension receipts will be able to advise on reporting obligations and
              any treaty relief available.
            </p>
          </div>
        </div>
      </section>

      {/* ── Alternatives to DASP ─────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Should you claim?"
            title="Alternatives to DASP &mdash; should you leave super in Australia?"
            sub="If there is any chance you will return to Australia, leaving your super in the fund may be worth considering."
          />
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Claiming DASP is not compulsory. Many former temporary residents choose to leave their super
            in Australia if:
          </p>
          <ul className="space-y-2 text-sm text-slate-600 mb-6 ml-4">
            <li className="flex gap-2"><span className="text-slate-400 shrink-0">&bull;</span>They intend to return to Australia on a new visa in the future.</li>
            <li className="flex gap-2"><span className="text-slate-400 shrink-0">&bull;</span>They are considering applying for permanent residency.</li>
            <li className="flex gap-2"><span className="text-slate-400 shrink-0">&bull;</span>The DASP withholding tax (especially 65%) represents too large a loss.</li>
            <li className="flex gap-2"><span className="text-slate-400 shrink-0">&bull;</span>They want the super to keep growing in a low-tax Australian super environment.</li>
          </ul>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2">Reasons to leave it in Australia</p>
              <ul className="space-y-2 text-sm text-green-900">
                <li className="flex gap-2"><span className="shrink-0 mt-0.5">&#10003;</span>Super grows tax-free (15% earnings tax in accumulation)</li>
                <li className="flex gap-2"><span className="shrink-0 mt-0.5">&#10003;</span>Access at preservation age if you later get PR or citizenship</li>
                <li className="flex gap-2"><span className="shrink-0 mt-0.5">&#10003;</span>Avoids the 35% or 65% DASP withholding hit now</li>
                <li className="flex gap-2"><span className="shrink-0 mt-0.5">&#10003;</span>No deadline &mdash; you can still claim DASP years later</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">Risks of leaving it in Australia</p>
              <ul className="space-y-2 text-sm text-red-900">
                <li className="flex gap-2"><span className="shrink-0 mt-0.5">&#10007;</span>Fund may close dormant account after ~5 years &rarr; transferred to ATO</li>
                <li className="flex gap-2"><span className="shrink-0 mt-0.5">&#10007;</span>Ongoing insurance premiums may erode the balance</li>
                <li className="flex gap-2"><span className="shrink-0 mt-0.5">&#10007;</span>Hard to manage from overseas without myGov access</li>
                <li className="flex gap-2"><span className="shrink-0 mt-0.5">&#10007;</span>Currency risk on the eventual DASP payment</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-800 mb-1">If you do leave it in Australia</p>
            <p className="text-sm text-blue-900 leading-relaxed">
              Keep your super fund informed of your overseas address. Log in to your fund and myGov
              periodically. If possible, make a small personal contribution each year to reset the
              inactivity clock and prevent the account from being transferred to the ATO. If you later
              become an Australian permanent resident or citizen, you can access your super at normal
              preservation age (currently 60) through standard release conditions &mdash; DASP becomes
              irrelevant.
            </p>
          </div>
        </div>
      </section>

      {/* ── Cross-link ───────────────────────────────────────────────── */}
      <section className="py-8 bg-white">
        <div className="container-custom max-w-3xl">
          <div className="bg-slate-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 mb-0.5">Investing while on a temporary visa?</p>
              <p className="text-xs text-slate-500">See our complete guide to foreign investment in Australia &mdash; shares, property, and tax for non-residents.</p>
            </div>
            <Link href="/foreign-investment/super" className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap">
              Foreign Investment Super Guide &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
          <div className="space-y-4">
            {LEAVING_AU_FAQS.map((faq) => (
              <details key={faq.q} className="group bg-white rounded-xl border border-slate-200">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3" aria-hidden="true">&#8964;</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">Need specialist tax advice?</h2>
            <p className="text-slate-400 text-sm">Australian tax agents with international specialisation can help with DASP calculations, NZ portability, SMSF wind-ups, and your final Australian tax return.</p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link
              href="/advisors/tax-agents"
              className="px-5 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Find a Tax Agent
            </Link>
            <Link
              href="/super"
              className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              &larr; Super Hub
            </Link>
          </div>
        </div>
      </section>

      {/* ── FX Provider Strip ────────────────────────────────────────── */}
      {fxProviders.length > 0 && (
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">INTERNATIONAL TRANSFERS</p>
                <h2 className="text-lg font-bold text-slate-900">Transfer your superannuation overseas</h2>
                <p className="text-sm text-slate-500 mt-1">Once your superannuation is released, use a specialist FX provider to minimise transfer costs.</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {fxProviders.map((b) => (
                  <div key={b.slug} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                      <p className="text-xs"><span className="text-amber-600" aria-hidden="true">{renderStars(Number(b.rating))}</span> <span className="font-semibold text-slate-600" aria-label={`${(Number(b.rating) || 0).toFixed(1)} out of 5 stars`}>{(Number(b.rating) || 0).toFixed(1)}</span></p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.tagline}</p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-xs font-semibold text-slate-700 mb-2">{b.benefit_cta ?? b.cta_text ?? "Open Account"}</p>
                      <a
                        href={getAffiliateLink(b)}
                        rel={AFFILIATE_REL}
                        target="_blank"
                        className="block text-center w-full px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition-colors"
                      >
                        {b.cta_text ?? "Open Account →"}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── AdvisorPrompt ────────────────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Get advice before accessing your super</h2>
          <AdvisorPrompt type="financial_planner" />
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-500 leading-relaxed">{SUPER_WARNING_SHORT} {GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
