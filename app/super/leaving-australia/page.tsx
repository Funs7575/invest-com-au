import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { DASP_WARNING, SUPER_WARNING_SHORT, GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Leaving Australia? Super Guide — DASP, Tax & NZ KiwiSaver Portability (2026) — Invest.com.au",
  description:
    "How to claim your Australian super when leaving Australia. DASP (Departing Australia Superannuation Payment) guide: 35% withholding tax, 65% for Working Holiday Makers, step-by-step claim process, and NZ KiwiSaver portability. Updated March 2026.",
  openGraph: {
    title: "Leaving Australia Super Guide — DASP & NZ Portability (2026)",
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

const DASP_STEPS = [
  {
    step: 1,
    title: "Leave Australia — your visa must cease",
    detail:
      "You can only claim DASP after you have departed Australia AND your visa is cancelled or has expired. You cannot apply for DASP while you are still in Australia, or if you still hold a valid Australian visa (except where the visa is expired and you have departed). Keep your departure records (boarding pass, passport stamps) and note the exact date your visa expires or is cancelled.",
  },
  {
    step: 2,
    title: "Wait for visa cancellation or expiry",
    detail:
      "There is a mandatory waiting period — you must wait until your visa has actually ceased (either expired or been cancelled). If you hold a visa with a future expiry date, you must wait until that date passes before applying. Working Holiday Makers: your visa is generally cancelled when you depart, so you can apply soon after leaving. Other visa types (457, 482 TSS): the employer sponsor may need to cancel the visa — confirm the cancellation date with the Department of Home Affairs.",
  },
  {
    step: 3,
    title: "Gather your super fund details",
    detail:
      "Collect the following for each super fund you hold: fund name, ABN, member number, estimated account balance, and your contact details at your overseas address. Log into myGov before you leave Australia to get a full picture of all funds registered under your TFN. If you've lost track of a fund, you can still search via the ATO's SuperSeeker tool using your TFN from overseas.",
  },
  {
    step: 4,
    title: "Apply via the ATO's DASP online portal",
    detail:
      "Go to ato.gov.au/dasp and use the online application portal. You will need: Australian TFN, fund details, your passport, proof of identity, and your overseas bank account details (for payment). The ATO sends the DASP request to your fund(s). Your fund has 28 days to pay the DASP claim. The withholding tax is deducted by your fund before payment — you will not receive the gross amount.",
  },
  {
    step: 5,
    title: "Receive payment (minus withholding tax)",
    detail:
      "Your fund transfers the after-tax DASP amount directly to your nominated bank account. The withholding tax (35% for most visa holders on the taxed element, 65% for Working Holiday Makers) is automatically deducted — you do not need to file an Australian tax return for this payment as DASP withholding is a final tax. If you have super with the ATO (unclaimed super), you claim this separately via the ATO's DASP portal.",
  },
];

const DASP_WITHHOLDING_RATES = [
  { element: "Taxed element", rate: "35%", note: "Most temporary visa holders — the standard DASP rate" },
  { element: "Untaxed element", rate: "45%", note: "Applies to some public sector super funds" },
  { element: "Tax-free element", rate: "0%", note: "After-tax personal contributions (non-concessional)" },
  { element: "Working Holiday Maker (all elements)", rate: "65%", note: "Special regime for 417/462 visa holders — introduced 2017" },
];

const LEAVING_AU_SECTIONS = [
  {
    heading: "Who can claim DASP?",
    body: "DASP is available to people who:\n\n1. Were in Australia on a temporary visa (not a permanent visa or Australian citizenship)\n2. Have departed Australia\n3. No longer hold a valid Australian visa\n4. Are not an Australian or New Zealand citizen\n5. Are not an Australian permanent resident\n\nVisa types that are generally DASP-eligible:\n• Skilled temporary visas (subclass 457, 482 TSS, 400, 408, 489, 491)\n• Working Holiday visas (417, 462)\n• Student visas (500) — if you worked and received SG contributions\n• Business visitor visas where SG contributions were made\n\nPermanent residents and citizens cannot claim DASP — their super is preserved until they reach preservation age (currently 60 for most people). Residents who later become non-residents must wait for a normal release condition (retirement, preservation age) or a specific early release condition.",
  },
  {
    heading: "Timing rules — when to apply for DASP",
    body: "You can apply for DASP once:\n\n• You have physically departed Australia, AND\n• Your visa has expired or been cancelled\n\nThere is no time limit on applying for DASP — you can claim years after you leave, and your super fund will hold the balance (earning investment returns) until you apply.\n\nPractical timing: apply as soon as your visa has ceased. There's no benefit to waiting. The ATO's DASP portal is accessible from overseas at ato.gov.au/dasp.\n\nApplying while still in Australia: not permitted. If you apply while you have an active visa (or are still physically in Australia), the application will be rejected.\n\nMultiple funds: you must apply for DASP from each fund separately (or use the ATO DASP portal, which can handle multiple funds in one application). Check your ATO myGov account before departing to ensure you have details for all accounts.",
  },
  {
    heading: "How DASP withholding tax is calculated — worked example",
    body: "The DASP withholding tax is applied to different 'elements' of your super balance separately.\n\nMost accumulated super for employed people consists primarily of the 'taxed element' — employer SG contributions and salary sacrifice contributions that had 15% tax deducted when they were paid in.\n\nWorked example for a general temporary visa holder:\n\nSuper account balance: $40,000\nBreakdown: $38,000 taxed element + $2,000 tax-free element (after-tax personal contributions)\n\nWithholding calculation:\n• $38,000 × 35% = $13,300 withheld\n• $2,000 × 0% = $0 withheld\n• Total withheld: $13,300\n• DASP payment received: $26,700\n\nFor a Working Holiday Maker with the same balance:\n• $38,000 × 65% = $24,700 withheld\n• $2,000 × 0% = $0 withheld\n• Total withheld: $24,700\n• DASP payment received: $15,300\n\nThis is why the DASP tax rates are significant — particularly for WHMs who accumulated a meaningful balance on working holidays.",
  },
  {
    heading: "Working Holiday Maker special regime (417 & 462 visas)",
    body: "The Australian Government introduced a special DASP withholding rate for Working Holiday Makers (WHMs) in 2017 — a flat 65% on all taxable elements, regardless of the normal marginal rates.\n\nThis rate applies if at any time during your Australian stay you held a subclass 417 (Working Holiday) or 462 (Work and Holiday) visa, even if you later moved to a different visa type.\n\nBackground: The WHM rate was increased from 35% to 65% as part of the government's response to the 2016 Backpacker Tax review. It was and remains controversial — international advocacy groups and tourism industry bodies have repeatedly called for the rate to be reduced, but as of March 2026 it stands at 65%.\n\nPractical implication: if you earned $50,000 during a working holiday and had $5,750 in SG contributions (11.5%), you would receive approximately $2,013 after the 65% DASP tax — versus $3,738 under the 35% rate. The difference is significant for WHMs who work for extended periods.\n\nNZ citizens on WHM visas: NZ citizens are generally eligible for the trans-Tasman portability scheme (see below) rather than DASP — this is usually much more favourable.",
  },
  {
    heading: "NZ Trans-Tasman super portability to KiwiSaver",
    body: "New Zealand citizens (and permanent residents with a NZ address) can transfer their Australian super directly to a KiwiSaver account in New Zealand — without paying the DASP withholding tax.\n\nThis is a significant advantage: instead of receiving 35% (or 65% WHM rate) less via DASP, you receive the full amount transferred to KiwiSaver (minus a small fee charged by the NZ receiving scheme).\n\nHow it works:\n1. Open a KiwiSaver account with a participating provider\n2. Contact your Australian super fund(s) and request a trans-Tasman transfer\n3. Your fund sends the transfer directly to your KiwiSaver fund\n4. The NZ receiving scheme deducts a withholding tax based on NZ tax rules — typically much lower than the Australian DASP rate\n\nEligibility:\n• NZ citizen or permanent resident in NZ\n• Departed Australia (not currently residing in Australia)\n• KiwiSaver account must be with a scheme participating in the portability arrangement\n\nKey limitation: the transferred amount is preserved in KiwiSaver under NZ rules. You generally can't access it until age 65 (KiwiSaver first home withdrawal or hardship exceptions aside). For NZ citizens who intend to stay in NZ permanently, this is almost always preferable to claiming DASP.",
  },
  {
    heading: "What if you return to Australia later?",
    body: "If you return to Australia on a new visa (including potentially a permanent visa), any super that remains in your Australian funds is still yours — it was never forfeited.\n\nIf you claimed DASP and return: If you claimed DASP and paid the withholding tax, and then return to Australia on a new visa, your super 'slate' is clean — you can start accumulating new super contributions under your new visa. You cannot reclaim the DASP withholding tax you paid.\n\nIf you did NOT claim DASP and return: Your old super accounts are still there, holding your balance. You can continue contributing under your new visa and roll the accounts together at any time.\n\nNZ citizens who transferred to KiwiSaver: The transferred amount stays in KiwiSaver even if you return to Australia. New Australian super accumulation begins fresh.\n\nImportant: if you later become an Australian permanent resident or citizen, you can access your super at preservation age through standard release conditions — DASP becomes irrelevant (and you can't claim it, as it requires you to not be a permanent resident or citizen at time of application).",
  },
];

const LEAVING_AU_FAQS = [
  {
    question: "How long does a DASP claim take to process?",
    answer:
      "Once you submit your application via the ATO DASP online portal, your fund has 28 days to pay the DASP claim. In practice, many straightforward claims are processed in 5–15 business days. Claims may take longer if there are identity verification issues, if you have multiple funds, or if the fund needs to contact you for additional information. If your fund has not paid within 28 days, you can contact the ATO on 13 10 20.",
  },
  {
    question: "Can I claim DASP if I'm still in Australia with an expired visa?",
    answer:
      "No — you must have physically departed Australia before you can claim DASP. The requirement is both that your visa has ceased AND that you have departed. If you have overstayed your visa and are still in Australia, you cannot claim DASP and should seek immigration advice immediately.",
  },
  {
    question: "Do I need to file an Australian tax return after claiming DASP?",
    answer:
      "Generally no — DASP withholding is a final tax. The fund withholds the applicable rate and pays it to the ATO on your behalf. You do not need to lodge an Australian tax return solely because you claimed DASP. However, if you earned other Australian income during your stay (and haven't yet lodged a return for those years), you may need to lodge a return for those income years. The DASP payment itself is not included in an Australian tax return.",
  },
  {
    question: "What if I worked for multiple employers and have super in several funds?",
    answer:
      "You need to claim DASP from each fund separately. The ATO's DASP online portal at ato.gov.au/dasp allows you to apply to multiple funds in a single session. You'll need each fund's name, ABN, and your member number. Before leaving Australia, log into myGov to see all funds linked to your TFN so you don't miss any accounts. The ATO also holds unclaimed super for people who couldn't be located by their fund — this can also be claimed through the DASP portal.",
  },
  {
    question: "Is the DASP rate the same for all temporary visa types?",
    answer:
      "No. The standard DASP withholding rate on the taxed element is 35% for most temporary visa holders. However, Working Holiday Makers (subclass 417 and 462 visas) are subject to a special 65% withholding rate on all taxable elements. The untaxed element (rare — found in some older public sector funds) is taxed at 45%. The tax-free element (after-tax personal contributions) is always 0% DASP withholding. NZ citizens have the option to avoid DASP entirely by transferring to KiwiSaver under the trans-Tasman portability arrangement.",
  },
];

export default function LeavingAustraliaPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Super", url: `${SITE_URL}/super` },
    { name: "Leaving Australia" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LEAVING_AU_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/super" className="hover:text-slate-200">Super</Link>
            <span>/</span>
            <span className="text-slate-300">Leaving Australia</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs font-semibold text-blue-300 mb-4">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              DASP · Working Holiday · NZ KiwiSaver · Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Leaving Australia?{" "}
              <span className="text-blue-400">Your Super Guide — DASP &amp; NZ Portability</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Everything temporary visa holders need to know about claiming Australian super when departing —
              the DASP process, withholding rates (including the 65% WHM rate), and the NZ KiwiSaver
              portability option for New Zealand citizens.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-red-200 p-5">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1">DASP Tax Rate</p>
              <p className="text-xl font-black text-red-700">35%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Standard rate on the taxed element for most temporary visa holders. Applied before payment.</p>
            </div>
            <div className="bg-white rounded-2xl border border-orange-200 p-5">
              <p className="text-xs font-bold text-orange-800 uppercase tracking-wide mb-1">Working Holiday Makers</p>
              <p className="text-xl font-black text-orange-700">65% WHT</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Special regime for 417 and 462 visa holders — the highest DASP withholding rate in Australia.</p>
            </div>
            <div className="bg-white rounded-2xl border border-blue-200 p-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">NZ Citizens</p>
              <p className="text-xl font-black text-blue-700">KiwiSaver</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">NZ citizens can transfer Australian super directly to KiwiSaver without the DASP withholding rate.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DASP Warning Banner ──────────────────────────────────────── */}
      <section className="py-8">
        <div className="container-custom max-w-3xl">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-5">
            <p className="text-sm font-bold text-red-900 mb-2">The DASP withholding rate is not a mistake — it&apos;s deliberately high</p>
            <p className="text-sm text-red-800 leading-relaxed">{DASP_WARNING}</p>
          </div>
        </div>
      </section>

      {/* ── Step-by-Step DASP Process ────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Step-by-step"
            title="How to claim DASP — the complete process"
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

      {/* ── Withholding Rates Table ──────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Rates table"
            title="DASP withholding rates by element type"
            sub="Withholding rates apply to different components of your super balance. Most employed Australians have primarily the 'taxed element'."
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200 max-w-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Super element</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-red-300">DASP Rate</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-slate-400">Notes</th>
                </tr>
              </thead>
              <tbody>
                {DASP_WITHHOLDING_RATES.map((row, i) => (
                  <tr key={row.element} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs">{row.element}</td>
                    <td className={`px-5 py-3.5 font-black text-sm ${row.rate === "65%" ? "text-orange-600" : row.rate === "0%" ? "text-green-600" : "text-red-600"}`}>
                      {row.rate}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs leading-relaxed">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">Rates verified as at March 2026 per ATO schedule. Subject to change by legislation.</p>
        </div>
      </section>

      {/* ── Content Sections ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Full guide" title="Everything about DASP and leaving Australia" />
          <div className="space-y-10">
            {LEAVING_AU_SECTIONS.map((section) => (
              <div key={section.heading}>
                <h3 className="text-base font-extrabold text-slate-900 mb-3">{section.heading}</h3>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {section.body.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cross-link ───────────────────────────────────────────────── */}
      <section className="py-8">
        <div className="container-custom max-w-3xl">
          <div className="bg-slate-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 mb-0.5">Investing while on a temporary visa?</p>
              <p className="text-xs text-slate-500">See our complete guide to foreign investment in Australia — shares, property, and tax for non-residents.</p>
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
              <details key={faq.question} className="group bg-white rounded-xl border border-slate-200">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3">⌄</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.answer}
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
            <p className="text-slate-400 text-sm">Australian tax agents with international specialisation can help with DASP calculations, NZ portability, and your final Australian tax return.</p>
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
              ← Super Hub
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">{SUPER_WARNING_SHORT} {GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
