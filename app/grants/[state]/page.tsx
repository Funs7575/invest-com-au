import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

// ─── Federal grant references ─────────────────────────────────────────────────

const FEDERAL_GRANTS = {
  rdTax: {
    title: "R&D Tax Incentive",
    href: "/grants/rd-tax-incentive",
    badge: "FEDERAL · OPEN",
    blurb:
      "43.5% refundable cash offset on eligible R&D spend — any industry with genuine technical uncertainty qualifies.",
  },
  emdg: {
    title: "Export Market Development Grant (EMDG)",
    href: "/grants/emdg",
    badge: "FEDERAL · ROUND 4",
    blurb:
      "Reimburse up to 50% of overseas marketing spend — up to $80K/year. Trade shows, overseas reps, foreign-market research.",
  },
  igp: {
    title: "Industry Growth Program",
    href: "/grants/industry-growth-program",
    badge: "FEDERAL · CLOSING SOON",
    blurb:
      "Up to $5M for SMEs commercialising new technologies across five priority industries.",
  },
} as const;

type GrantKey = keyof typeof FEDERAL_GRANTS;

interface StateLink {
  state: string;
  program: string;
  href: string;
}

interface IndustryConfig {
  label: string;
  metaDescription: string;
  intro: string;
  keyGrants: GrantKey[];
  statePrograms: StateLink[];
  faqItems: { q: string; a: string }[];
}

const INDUSTRY_MAP: Record<string, IndustryConfig> = {
  tech: {
    label: "Technology & Software",
    metaDescription: `Australian government grants for technology and software companies in ${CURRENT_YEAR} — R&D Tax Incentive, EMDG, and state programs.`,
    intro:
      "Technology companies are among the biggest beneficiaries of Australia's R&D Tax Incentive — software projects involving genuine technical uncertainty typically qualify. Federal grants also support tech export, commercialisation, and sector growth.",
    keyGrants: ["rdTax", "emdg", "igp"],
    statePrograms: [
      { state: "NSW", program: "MVP Ventures", href: "/grants/nsw/mvp-ventures" },
      { state: "VIC", program: "LaunchVic", href: "/grants/vic/launchvic" },
      { state: "QLD", program: "Ignite Ideas Fund", href: "/grants/qld/ignite-ideas" },
      { state: "ACT", program: "ACT Innovation Connect", href: "/grants/act/act-innovation-fund" },
    ],
    faqItems: [
      {
        q: "Can SaaS companies claim the R&D Tax Incentive?",
        a: "Yes — software development qualifies when there is genuine technical uncertainty. Novel algorithms, new protocols, and experimental engineering qualify; pure business-process improvements do not.",
      },
      {
        q: "Do government grants count as taxable income?",
        a: "R&D Tax Incentive refunds are not assessable income when company turnover is under $20M. EMDG payments are generally assessable. Confirm with a registered tax agent.",
      },
    ],
  },
  biotech: {
    label: "Biotech & Medtech",
    metaDescription: `Government funding for Australian biotech, medtech, and life science companies in ${CURRENT_YEAR}.`,
    intro:
      "Biotech and medtech companies often attract the highest R&D Tax Incentive claims in Australia — clinical trials, device development, and pharmaceutical formulation all qualify. Multiple funding pathways exist from early research through commercialisation.",
    keyGrants: ["rdTax", "igp"],
    statePrograms: [
      { state: "VIC", program: "VIC Innovation Network", href: "/grants/vic/vic-innovation-network" },
      { state: "QLD", program: "Advance Queensland", href: "/grants/qld/advance-qld" },
    ],
    faqItems: [
      {
        q: "Do clinical trials qualify for R&D Tax Incentive?",
        a: "Phase 1–3 clinical trials generally qualify as core R&D activities. Pre-clinical research, animal studies, and failed experiments all count — the incentive covers the cost of uncertainty, not just successes.",
      },
      {
        q: "What TGA registration support exists?",
        a: "The Industry Growth Program can support medtech companies with commercialisation activities including regulatory submissions and market access planning.",
      },
    ],
  },
  agriculture: {
    label: "Agriculture & Agtech",
    metaDescription: `Grants for Australian agriculture, agtech, and food & beverage businesses in ${CURRENT_YEAR}.`,
    intro:
      "Australian agribusiness has access to both export and R&D grant pathways. Agtech companies — precision agriculture, vertical farming, food processing technology — often qualify for R&D incentives. Export-focused agribusinesses should consider the EMDG.",
    keyGrants: ["rdTax", "emdg", "igp"],
    statePrograms: [
      { state: "QLD", program: "Advance Queensland", href: "/grants/qld/advance-qld" },
      { state: "WA", program: "Collab Vouchers", href: "/grants/wa/collab-vouchers" },
    ],
    faqItems: [
      {
        q: "Can a farm claim the R&D Tax Incentive?",
        a: "Pure farming operations rarely qualify, but companies developing new crop varieties, pest-control technology, or precision monitoring systems may qualify when there is genuine experimental uncertainty.",
      },
      {
        q: "Is the EMDG available to agricultural exporters?",
        a: "Yes — EMDG is open to any business exporting Australian goods. Overseas trade shows, promotional materials, and overseas representatives are all reimbursable costs.",
      },
    ],
  },
  manufacturing: {
    label: "Advanced Manufacturing",
    metaDescription: `Australian government grants for manufacturers in ${CURRENT_YEAR} — Industry Growth Program, R&D Tax Incentive, and state programs.`,
    intro:
      "Advanced manufacturing is a national priority. The Industry Growth Program's priority industries include advanced manufacturing, making it one of the most accessible federal grants for factory-floor innovation. R&D tax offsets apply to process development and materials science.",
    keyGrants: ["rdTax", "igp", "emdg"],
    statePrograms: [
      { state: "NSW", program: "Technology Adoption", href: "/grants/nsw/technology-adoption" },
      { state: "SA", program: "SA Tech Voucher", href: "/grants/sa/sa-techvoucher" },
    ],
    faqItems: [
      {
        q: "What is a 'priority industry' under the Industry Growth Program?",
        a: "The five priority areas are advanced manufacturing, defence industry, critical technologies, value-add in resources and energy, and enabling capabilities. Most manufacturers will find their activity fits one or more.",
      },
      {
        q: "Can we claim R&D if we also receive an Industry Growth Program grant?",
        a: "Yes — the grants are stackable, but any grant directly funding R&D must be declared when calculating your incentive (it reduces the claimable base).",
      },
    ],
  },
  "clean-energy": {
    label: "Clean Energy & Climate Tech",
    metaDescription: `Grants and incentives for Australian clean energy and climate technology companies in ${CURRENT_YEAR}.`,
    intro:
      "Clean energy is a high-priority area for Commonwealth funding. The Industry Growth Program explicitly lists clean energy transition as a priority sector. R&D Tax Incentive applies to energy-efficiency technology, battery storage, hydrogen, and grid innovation.",
    keyGrants: ["rdTax", "igp"],
    statePrograms: [
      { state: "VIC", program: "LaunchVic", href: "/grants/vic/launchvic" },
      { state: "QLD", program: "Advance Queensland", href: "/grants/qld/advance-qld" },
    ],
    faqItems: [
      {
        q: "Is hydrogen energy eligible for R&D Tax Incentive?",
        a: "Yes — hydrogen production technology, electrolysis efficiency improvements, and storage solutions typically involve technical uncertainty that qualifies as core R&D activity.",
      },
      {
        q: "Do solar or wind farm operators get R&D tax offsets?",
        a: "Operational farms generally don't qualify. But companies developing new solar cell materials, wind turbine designs, or grid software may qualify for R&D incentives.",
      },
    ],
  },
  mining: {
    label: "Mining & Resources",
    metaDescription: `Government grants for Australian mining, resources, and extractives companies in ${CURRENT_YEAR}.`,
    intro:
      "Resources companies with technical innovation programs have long used the R&D Tax Incentive for geological modelling, process chemistry, and extraction technology. The Industry Growth Program also targets critical minerals processing as a national priority.",
    keyGrants: ["rdTax", "igp"],
    statePrograms: [
      { state: "WA", program: "Collab Vouchers", href: "/grants/wa/collab-vouchers" },
      { state: "NT", program: "NT Business Innovation", href: "/grants/nt/nt-business-innovation" },
    ],
    faqItems: [
      {
        q: "Does mine geology count as R&D?",
        a: "Routine surveys don't qualify. Developing new geophysical modelling techniques, novel ore-processing chemistry, or experimental mine-safety systems can qualify when there is genuine scientific uncertainty.",
      },
      {
        q: "Are critical minerals companies eligible for additional support?",
        a: "Yes — critical minerals processing is an explicit Industry Growth Program priority. Lithium, cobalt, nickel, and rare earths processing technology has strong federal funding support.",
      },
    ],
  },
  healthcare: {
    label: "Healthcare & Allied Health",
    metaDescription: `Funding and grants for Australian healthcare and allied health businesses in ${CURRENT_YEAR}.`,
    intro:
      "Healthcare providers and allied health businesses can access grants for technology adoption, staff training, and digital transformation. Companies developing diagnostic tools or clinical software platforms may also access the R&D Tax Incentive.",
    keyGrants: ["rdTax", "igp"],
    statePrograms: [
      { state: "NSW", program: "MVP Ventures", href: "/grants/nsw/mvp-ventures" },
      { state: "VIC", program: "VIC Innovation Network", href: "/grants/vic/vic-innovation-network" },
    ],
    faqItems: [
      {
        q: "Can a GP clinic or allied health practice access R&D grants?",
        a: "Standard clinical practice doesn't qualify. Practices developing new telehealth platforms, AI diagnostic tools, or novel treatment protocols under experimental conditions may have an R&D claim.",
      },
      {
        q: "Are training grants available for aged care providers?",
        a: "Federal aged care providers can access workforce-related grants through DESE. State programs also cover digital transformation — check the relevant state program page for details.",
      },
    ],
  },
  export: {
    label: "Export Businesses",
    metaDescription: `EMDG and other export grants for Australian businesses in ${CURRENT_YEAR}.`,
    intro:
      "The Export Market Development Grant (EMDG) is the primary federal support for Australian exporters. Eligible costs include international trade shows, promotional trips, overseas marketing materials, and the first $15,000 in export market research. Up to 50% of spend is reimbursed — capped at $80K/year across tiers.",
    keyGrants: ["emdg", "rdTax"],
    statePrograms: [
      { state: "QLD", program: "Advance Queensland", href: "/grants/qld/advance-qld" },
    ],
    faqItems: [
      {
        q: "Who can apply for EMDG?",
        a: "Australian businesses with ABN and annual income under $50M that export Australian goods or services are eligible. Tier 1 (up to $40K) is specifically designed for first-time exporters.",
      },
      {
        q: "How does the 50% reimbursement work?",
        a: "Tier 1 covers 50% of eligible spend between $5,000 and $80,000 in your first two years of exporting. The grant is paid after the financial year ends.",
      },
    ],
  },
  creative: {
    label: "Creative & Digital Media",
    metaDescription: `Grants for Australian creative, content, film, and digital media businesses in ${CURRENT_YEAR}.`,
    intro:
      "Creative industries in Australia benefit from Screen Australia funding, Australia Council arts grants, and the EMDG for international co-productions. Digital media companies developing proprietary platforms or creative technology may also access the R&D Tax Incentive.",
    keyGrants: ["emdg", "rdTax"],
    statePrograms: [
      { state: "NSW", program: "MVP Ventures", href: "/grants/nsw/mvp-ventures" },
      { state: "VIC", program: "LaunchVic", href: "/grants/vic/launchvic" },
    ],
    faqItems: [
      {
        q: "Is game development eligible for R&D Tax Incentive?",
        a: "Yes — video game studios developing novel game engines, AI systems, or rendering technology can qualify. Creative game design alone doesn't qualify, but underlying technical innovation does.",
      },
      {
        q: "Can content creators access EMDG?",
        a: "If you export Australian content (films, TV, digital media, music) and spend on overseas promotion, you may qualify for EMDG. Confirm eligibility with Austrade.",
      },
    ],
  },
  defence: {
    label: "Defence & Aerospace",
    metaDescription: `Australian government grants for defence industry and aerospace companies in ${CURRENT_YEAR}.`,
    intro:
      "Defence industry is an explicit priority under the Industry Growth Program. Australian SMEs supplying to Defence can access CDIC (Centre for Defence Industry Capability) support, export facilitation, and R&D Tax Incentive for sovereign capability development.",
    keyGrants: ["rdTax", "igp"],
    statePrograms: [
      { state: "SA", program: "SA Tech Voucher", href: "/grants/sa/sa-techvoucher" },
    ],
    faqItems: [
      {
        q: "What is the Centre for Defence Industry Capability (CDIC)?",
        a: "CDIC provides business advice, export support, and connects Australian SMEs with Defence capability opportunities. CDIC advisors help businesses determine which government grants best fit their situation.",
      },
      {
        q: "Does classified R&D qualify for R&D Tax Incentive?",
        a: "Classified defence work may qualify but requires careful compliance — some activities need ATO pre-registration. The R&D scope must be described clearly even if operationally classified.",
      },
    ],
  },
};

// ─── Static params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return Object.keys(INDUSTRY_MAP).map((slug) => ({ state: slug }));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ state: string }> };

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: slug } = await params;
  const cfg = INDUSTRY_MAP[slug];
  if (!cfg) return { title: "Not found" };
  return {
    title: `${cfg.label} Grants ${CURRENT_YEAR}: Federal & State Funding | Invest.com.au`,
    description: cfg.metaDescription,
    alternates: { canonical: `${SITE_URL}/grants/${slug}` },
    openGraph: {
      title: `${cfg.label} Grants ${CURRENT_YEAR}`,
      description: cfg.metaDescription,
      url: `${SITE_URL}/grants/${slug}`,
      type: "website",
      images: [{ url: `/api/og?title=${encodeURIComponent(cfg.label + " Grants Australia")}&sub=${encodeURIComponent("Federal · State Funding · R&D · EMDG · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GrantsIndustryPage({ params }: Props) {
  const { state: slug } = await params;
  const cfg = INDUSTRY_MAP[slug];
  if (!cfg) notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Grants", url: absoluteUrl("/startup/grants") },
    { name: cfg.label },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cfg.faqItems.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="container-custom py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-400 mb-6 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-slate-600">
            Home
          </Link>
          <span>›</span>
          <Link href="/startup/grants" className="hover:text-slate-600">
            Grants
          </Link>
          <span>›</span>
          <span className="text-slate-600">{cfg.label}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {cfg.label} Grants {CURRENT_YEAR}
          </h1>
          <p className="mt-2 text-lg text-slate-600">{cfg.intro}</p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Federal grants</h2>
          <div className="space-y-4">
            {cfg.keyGrants.map((key) => {
              const g = FEDERAL_GRANTS[key];
              return (
                <Link
                  key={key}
                  href={g.href}
                  className="block p-5 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900">{g.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{g.blurb}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                      {g.badge}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {cfg.statePrograms.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              State & territory programs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cfg.statePrograms.map(({ state, program, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                    {state}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{program}</span>
                </Link>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-3">
              State programs vary by jurisdiction and funding round. Check the program page for
              current status and deadlines.
            </p>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Frequently asked questions</h2>
          <div className="space-y-6">
            {cfg.faqItems.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold text-slate-900">{q}</h3>
                <p className="mt-1 text-slate-600 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-blue-50 border border-blue-100 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Get a grant eligibility review
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            A specialist grants advisor can identify which programs your{" "}
            {cfg.label.toLowerCase()} business qualifies for and help maximise your claim.
          </p>
          <Link
            href="/advisors"
            className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            Find a grants specialist
          </Link>
        </section>
      </div>
    </>
  );
}
