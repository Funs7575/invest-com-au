import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER } from "@/lib/compliance";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";
import Icon from "@/components/Icon";

export const revalidate = 43200;

export const metadata: Metadata = {
  title: `Foreign Investment in Australian Energy (${CURRENT_YEAR}) — FIRB, Critical Infrastructure & Tax`,
  description:
    "A practical guide for non-Australian investors in Australian oil, gas, LNG, refining and fuel-storage assets. FIRB thresholds, the 2025 national security amendments, dividend and royalty withholding, CGT for non-residents, and allied-nation frameworks.",
  alternates: { canonical: `${SITE_URL}/foreign-investment/energy` },
  openGraph: {
    title: `Foreign Investment in Australian Energy (${CURRENT_YEAR})`,
    description:
      "FIRB, critical infrastructure, withholding tax and allied-nation frameworks for foreign investors in Australian energy.",
    url: `${SITE_URL}/foreign-investment/energy`,
  },
};

const SECTIONS = [
  {
    heading: "Who this page is for",
    body:
      "Any non-Australian individual, company, or fund considering a direct or portfolio investment in Australian oil, gas, LNG, refining, or fuel-storage assets. The page covers the FIRB regime, the 2025 critical-infrastructure amendments, tax treatment for non-residents, and the bilateral frameworks that accelerate approvals for allied-nation investors. It is general information, not financial or legal advice — always engage a foreign-investment lawyer before committing capital.",
  },
  {
    heading: "FIRB — approval is the default for energy assets",
    body:
      "Australia's Foreign Acquisitions and Takeovers Act treats energy as a sensitive sector. In practice:\n\n• Direct acquisition of any interest in a petroleum tenement, LNG plant, refinery, pipeline, or major fuel-storage terminal is notifiable — the monetary threshold is zero for most of these asset classes.\n\n• Acquiring 10% or more of an ASX-listed petroleum producer typically triggers FIRB notification; acquiring 20% or more almost always does.\n\n• Passive portfolio investments below 10% in ASX-listed producers are generally exempt, although the Foreign Investment Review Board retains reserved powers.\n\n• Foreign government investors (sovereign wealth funds, state-owned enterprises) face heightened scrutiny regardless of threshold.\n\nThe statutory decision period is 30 days, but complex or sensitive-sector energy cases routinely run 90–180 days. Budget for Treasury imposing conditions — local processing undertakings, divestment triggers, and ongoing reporting are common.",
  },
  {
    heading: "Critical infrastructure — widened in 2025",
    body:
      "The Security of Critical Infrastructure Act was amended in 2025 to broaden the set of energy assets subject to national-security review. Assets now routinely inside the regime include:\n\n• LNG export terminals and their dedicated pipelines\n• The two remaining domestic refineries (Geelong, Lytton) and their crude/product jetties\n• Fuel-storage terminals above a prescribed capacity threshold\n• Gas transmission pipelines above a prescribed size\n\nWhere an asset is inside the critical infrastructure regime, the acquirer may face mandatory register-of-owners disclosure, cyber-security uplift obligations, and — in rare cases — a national-security divestment power under the Security of Critical Infrastructure Act. Engage specialist counsel early — pre-lodgement engagement with Treasury and the Cyber and Infrastructure Security Centre materially de-risks timelines.",
  },
  {
    heading: "Allied-nation frameworks — faster paths",
    body:
      "Investors from countries with formal bilateral investment or critical-minerals frameworks with Australia can typically expect faster, more predictable review. Relevant frameworks for energy include:\n\n• US–Australia Critical Minerals Framework (2025) and US–Australia Compact on supply-chain resilience\n• Japan–Australia Partnership on decarbonisation and hydrogen\n• Republic of Korea–Australia Comprehensive Strategic Partnership\n• EU–Australia Free Trade Agreement (finalised 2026)\n• UK–Australia Free Trade Agreement\n\nThese frameworks don't waive FIRB — they streamline it. Typical practical benefit: predictable 60–90 day turnaround on portfolio investments, published risk tiers for different asset types, and access to pre-lodgement guidance teams inside Treasury. Chinese and Russian investors, by contrast, face materially heightened national-security review on all energy asset classes.",
  },
  {
    heading: "Tax for non-resident energy investors",
    body:
      "Tax outcomes depend on (a) the asset class, (b) the investor's residence and applicable DTA, and (c) the holding structure.\n\n**Listed shares.** Non-residents holding less than 10% of an ASX-listed company are generally exempt from Australian CGT on disposal of those shares under Section 855-10 ITAA 1997. Dividend withholding is 30% on the unfranked portion (reduced by DTA — typically 15% for US, UK, Japan, Korea, NZ residents), and 0% on fully franked dividends.\n\n**Direct petroleum interests.** Direct interests in tenements, production, or royalty streams are Taxable Australian Property and therefore inside the Australian CGT net regardless of holding size.\n\n**Royalty income.** Paid as ordinary income to the holder. Non-residents are subject to royalty withholding tax — typically 30% at statutory rate, reduced by DTA (often to 10–15%). The withholding applies to both Crown royalties and secondary-market royalty payments where Australia-sourced.\n\n**PRRT.** The federal Petroleum Resource Rent Tax is paid by the project operator, not by equity holders. But PRRT affects dividend capacity — a rising PRRT liability compresses distributions to shareholders regardless of their residence.",
  },
  {
    heading: "Structuring considerations",
    body:
      "For any non-trivial investment, the holding structure is at least as important as the asset selection. Common structures for non-resident energy investors:\n\n• **Singapore holding company** — broad DTA network, strong IP regime, comfortable for family offices investing into Australian listed energy.\n\n• **Netherlands holding company** — strong DTA with Australia, established treaty structure for European investors; however recent BEPS changes have narrowed some benefits.\n\n• **Direct onshore Australian company** — simplest for operational assets, but subject to full Australian tax and reporting.\n\n• **Limited partnership** — popular for wholesale fund structures, particularly for sovereign wealth and institutional investors seeking passthrough treatment.\n\nStructure choice materially affects: withholding tax rates on dividends and royalties; CGT treatment on eventual exit; FIRB approval complexity (multi-layer structures face additional scrutiny); and annual compliance cost. A specialist foreign investment lawyer and a cross-border tax advisor should be engaged in parallel — the structure has to work for both regulatory approval and exit tax.",
  },
  {
    heading: "Practical next steps",
    body:
      "Before committing to an Australian energy investment as a non-resident:\n\n1. Engage a FIRB-specialist lawyer for a one-hour scoping call before signing any binding document. Pre-lodgement engagement with Treasury starts here.\n\n2. Commission a tax-structure memo covering the investor's home-country position, Australian withholding, and exit scenarios. Budget $15,000–$40,000 depending on complexity.\n\n3. Identify the asset's classification under the Security of Critical Infrastructure Act. This is often overlooked and materially affects timeline.\n\n4. Build a FIRB application budget — government fee schedule runs from ~A$14,000 to ~A$1.1m based on transaction value; legal fees add $45,000–$150,000 for straightforward matters.\n\n5. For operating energy assets, budget cyber and supply-chain security uplift — Australia's critical-infrastructure regime mandates minimum controls for many energy operators.",
  },
];

const FAQS = [
  {
    q: "Do I need FIRB approval to buy ASX-listed Woodside or Santos shares as a foreign investor?",
    a: "For a passive portfolio holding below 10% of the company, no — routine portfolio share purchases are generally exempt from FIRB notification. At 10% or more a notification is typically required, and at 20% or more it almost always is. Foreign government investors (including sovereign wealth funds and SOEs) face heightened scrutiny at lower thresholds.",
  },
  {
    q: "How long does FIRB approval take for an energy asset?",
    a: "The statutory period is 30 days but is almost always extended. For straightforward portfolio transactions in allied-nation investors, 60–90 days is typical. For direct tenement, LNG, refinery, or pipeline acquisitions — especially those inside the critical-infrastructure regime or from non-allied-nation investors — 90–180 days is typical and complex SOE cases can run 6–9 months.",
  },
  {
    q: "What is the difference between the FIRB regime and the Security of Critical Infrastructure Act?",
    a: "FIRB is the primary foreign investment gate and applies an economic and national-interest test. The Security of Critical Infrastructure Act (as amended in 2025) is a separate, ongoing obligation that applies to the operators of critical energy assets regardless of ownership — it covers register-of-owners disclosure, risk management programs, and cyber-security uplift. Many energy acquisitions now need to pass FIRB and also onboard under the Act.",
  },
  {
    q: "Do Section 855-10 CGT exemptions apply to direct petroleum tenements?",
    a: "No. Section 855-10 applies to portfolio holdings in listed companies. Direct interests in petroleum tenements and other Australian real property interests are Taxable Australian Property and stay inside the Australian CGT net for non-residents regardless of holding size.",
  },
  {
    q: "Can a foreign person own a royalty over an Australian petroleum project?",
    a: "Yes, but it is typically FIRB-notifiable because petroleum royalties count as interests in Australian real property. Royalty income is subject to withholding tax at statutory or DTA rates, and the treatment of PRRT interaction between the operator and the royalty holder should be modelled before purchase.",
  },
];

export default function ForeignInvestmentEnergyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    { name: "Energy" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
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

      <ForeignInvestmentNav current="/foreign-investment/energy" />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">
              Foreign Investment
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Energy</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Oil · Gas · LNG · Refining · {CURRENT_YEAR}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Foreign Investment in{" "}
              <span className="text-amber-500">Australian Energy</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              FIRB thresholds, the 2025 critical-infrastructure amendments,
              withholding tax, Section 855-10 portfolio exemption, royalty rules
              and allied-nation frameworks — what a non-Australian investor
              needs to know before committing capital to an Australian oil, gas,
              LNG, refining or fuel-storage asset.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-100">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                Sensitive sector
              </p>
              <p className="text-xl font-black text-amber-700">FIRB default</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Direct interests in tenements, LNG plants, refineries, pipelines,
                and most fuel storage are FIRB-notifiable at $0 threshold.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">
                Listed shares &lt;10%
              </p>
              <p className="text-xl font-black text-green-700">0% CGT</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Section 855-10 portfolio exemption applies to disposals of
                listed Woodside, Santos, Beach, Karoon and peer shares.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Royalty income
              </p>
              <p className="text-xl font-black text-slate-700">WHT 10–30%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Australia-sourced royalties are subject to withholding at
                statutory 30% reduced by applicable DTA — plan structure upfront.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Body sections */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Practitioner guide"
            title="The foreign investor's checklist for Australian energy"
            sub="Written for non-Australian investors in oil, gas, LNG, refining, and fuel storage."
          />

          <div className="space-y-10">
            {SECTIONS.map((s, i) => (
              <article key={s.heading}>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
                  {s.heading}
                </h2>
                <div className="prose prose-slate max-w-none text-sm md:text-base leading-relaxed whitespace-pre-line">
                  {s.body}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-slate-50 border-y border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="FAQ"
            title="Common questions"
            sub="Short answers to questions we get from non-resident energy investors."
          />
          <div className="space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group bg-white rounded-xl border border-slate-200 p-4"
              >
                <summary className="cursor-pointer font-bold text-slate-900 text-sm md:text-base flex items-start justify-between gap-3">
                  {f.q}
                  <Icon
                    name="chevron-down"
                    size={16}
                    className="text-slate-400 shrink-0 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed whitespace-pre-line">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Adviser CTA */}
      <section className="py-12 bg-slate-900 text-white">
        <div className="container-custom max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Engage specialist counsel before committing
          </h2>
          <p className="text-sm md:text-base text-slate-300 mb-6">
            FIRB and critical-infrastructure engagement is one of the few areas
            where upfront legal and tax cost reliably pays for itself through
            faster approval and better structure.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/advisors/foreign-investment-lawyers"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
            >
              Find a foreign investment lawyer
              <Icon name="arrow-right" size={16} />
            </Link>
            <Link
              href="/advisors/petroleum-royalties-advisors"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
            >
              Find a royalties advisor
            </Link>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {FOREIGN_INVESTOR_GENERAL_DISCLAIMER}
          </p>
        </div>
      </section>
    </div>
  );
}
