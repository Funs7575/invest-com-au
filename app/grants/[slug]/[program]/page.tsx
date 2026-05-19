import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import DatedStatBadge from "@/components/DatedStatBadge";

export const revalidate = 3600;

// ─── State/program registry ───────────────────────────────────────────────────

interface ProgramConfig {
  stateLabel: string;
  programLabel: string;
  fundingMax: string;
  fundingSourced: string;
  fundingStalesAt: string;
  description: string;
  eligibility: string[];
  eligibleCosts: string[];
  deadline?: string;
  roundStatus: string;
  faqItems: { q: string; a: string }[];
}

const STATE_PROGRAM_MAP: Record<string, Record<string, ProgramConfig>> = {
  nsw: {
    "mvp-ventures": {
      stateLabel: "New South Wales",
      programLabel: "MVP Ventures Grant",
      fundingMax: "$25,000",
      fundingSourced: "2026-03-01",
      fundingStalesAt: "2027-01-01",
      description:
        "NSW MVP Ventures helps early-stage technology startups validate their minimum viable product (MVP) with real customers. The grant covers up to 50% of eligible project costs to a maximum of $25,000 — giving founders runway to test product-market fit before raising external capital.",
      eligibility: [
        "Registered in NSW or intending to operate from NSW",
        "Technology-based product or service",
        "Less than 3 years of trading",
        "Annual turnover under $1.5M",
        "Not previously received an MVP Ventures grant",
      ],
      eligibleCosts: [
        "Customer discovery and user research",
        "Prototyping and MVP development",
        "Market validation activities",
        "Technical advisory services",
      ],
      deadline: "Rolling applications — check Service NSW for current intake",
      roundStatus: "Open",
      faqItems: [
        {
          q: "Can a solo founder apply?",
          a: "Yes — MVP Ventures accepts sole traders with an ABN. At least one co-founder must be based in NSW.",
        },
        {
          q: "Is the grant taxable?",
          a: "MVP Ventures payments are assessable income. Retain records of all grant-funded expenditure for your tax return.",
        },
      ],
    },
    "technology-adoption": {
      stateLabel: "New South Wales",
      programLabel: "Technology Adoption and Innovation Program",
      fundingMax: "$5,000",
      fundingSourced: "2026-03-01",
      fundingStalesAt: "2027-01-01",
      description:
        "The NSW Technology Adoption and Innovation Program provides vouchers to help small businesses adopt new digital tools and technologies. The voucher offsets the cost of technology consultants, software licences, and implementation support — bridging the gap between intent and execution.",
      eligibility: [
        "NSW-based small business with fewer than 20 employees",
        "GST-registered with a valid ABN",
        "Seeking to adopt a new digital or manufacturing technology",
        "Not received the voucher in the previous 12 months",
      ],
      eligibleCosts: [
        "Technology advisory consultants",
        "Software licences (first year)",
        "Hardware for technology adoption projects",
        "Staff training directly related to the new technology",
      ],
      roundStatus: "Subject to funding — check Service NSW",
      faqItems: [
        {
          q: "Can I apply for MVP Ventures and this voucher at the same time?",
          a: "Yes — the programs are separate and can be combined, provided each application relates to a distinct scope of work.",
        },
        {
          q: "How long does the voucher take to process?",
          a: "Processing is typically 4–8 weeks from application submission. Service NSW will contact you if additional information is required.",
        },
      ],
    },
  },
  vic: {
    launchvic: {
      stateLabel: "Victoria",
      programLabel: "LaunchVic",
      fundingMax: "$250,000",
      fundingSourced: "2026-03-01",
      fundingStalesAt: "2027-01-01",
      description:
        "LaunchVic is Victoria's dedicated startup agency, administering multiple grant programs to grow the Victorian startup ecosystem. Programs range from early-stage founder support through to ecosystem infrastructure grants for accelerators, incubators, and co-working hubs.",
      eligibility: [
        "Operating in or committing to relocate to Victoria",
        "For founder grants: early-stage tech startup",
        "For ecosystem grants: organisations supporting Victorian startups",
        "Program-specific criteria apply — see current open rounds",
      ],
      eligibleCosts: [
        "Product development and technical work",
        "Market validation",
        "Mentoring and advisory",
        "Program delivery costs (ecosystem grants)",
      ],
      roundStatus: "Multiple rounds — check LaunchVic website",
      faqItems: [
        {
          q: "Does LaunchVic only fund tech startups?",
          a: "LaunchVic primarily focuses on technology-based startups, but also funds ecosystem organisations — accelerators, events, research — that support the broader startup community.",
        },
        {
          q: "Can interstate founders apply?",
          a: "LaunchVic requires applicants to be based in Victoria or commit to establishing Victorian operations. Founder visa pathways exist for international founders.",
        },
      ],
    },
    "vic-innovation-network": {
      stateLabel: "Victoria",
      programLabel: "Victorian Innovation Network",
      fundingMax: "$100,000",
      fundingSourced: "2026-03-01",
      fundingStalesAt: "2027-01-01",
      description:
        "The Victorian Innovation Network connects businesses with university research capabilities and industry expertise. Grants support collaborative R&D projects between Victorian businesses and research institutions — particularly useful for scaling companies needing to solve hard technical problems.",
      eligibility: [
        "Victorian business with an ABN",
        "Collaborative project with a Victorian university or research institute",
        "Project has a genuine commercialisation pathway",
        "Minimum 50% co-contribution from the business applicant",
      ],
      eligibleCosts: [
        "Collaborative R&D with a Victorian research partner",
        "Technical feasibility studies",
        "Prototype development under a collaboration agreement",
        "Knowledge transfer activities",
      ],
      roundStatus: "Annual rounds — check Business Victoria",
      faqItems: [
        {
          q: "Which universities are eligible research partners?",
          a: "All eight Victorian universities are eligible, plus CSIRO, ANSTO, and other federal research agencies with Victorian labs.",
        },
        {
          q: "Can the business and university split the grant?",
          a: "The grant is paid to the business applicant, who then contracts the university research partner. The collaboration agreement governs payment terms.",
        },
      ],
    },
  },
  qld: {
    "ignite-ideas": {
      stateLabel: "Queensland",
      programLabel: "Ignite Ideas Fund",
      fundingMax: "$60,000",
      fundingSourced: "2026-03-01",
      fundingStalesAt: "2027-01-01",
      description:
        "Ignite Ideas Fund is Queensland's flagship commercialisation grant for early-stage innovative businesses. It funds activities that accelerate the commercialisation of a new product, service, or process — giving Queensland companies a boost from prototype to first paying customers.",
      eligibility: [
        "Queensland-based business or individual",
        "Developing a new innovative product, service, or process",
        "Not previously received Ignite Ideas funding",
        "Annual revenue under $5M",
      ],
      eligibleCosts: [
        "Intellectual property protection (patents, trade marks)",
        "Product development and prototyping",
        "Market validation and commercialisation planning",
        "Trial or pilot activities with customers",
      ],
      roundStatus: "Bi-annual — check Business Queensland",
      faqItems: [
        {
          q: "Can an individual (not a company) apply?",
          a: "Yes — Ignite Ideas accepts applications from individuals, sole traders, companies, and co-operatives registered in Queensland.",
        },
        {
          q: "Is there a minimum co-contribution?",
          a: "A 50% co-contribution of total eligible project costs is generally required, which can include in-kind contributions such as your own time.",
        },
      ],
    },
    "advance-qld": {
      stateLabel: "Queensland",
      programLabel: "Advance Queensland",
      fundingMax: "$500,000",
      fundingSourced: "2026-03-01",
      fundingStalesAt: "2027-01-01",
      description:
        "Advance Queensland is the Queensland Government's flagship innovation investment program, covering multiple grant streams from proof-of-concept through to large-scale industry transformation. It spans clean energy, biomedical, agtech, defence, and digital industries.",
      eligibility: [
        "Queensland-based business, research organisation, or individual",
        "Project addresses a priority industry area",
        "Genuine innovation beyond standard practice",
        "Program-specific criteria apply — multiple streams available",
      ],
      eligibleCosts: [
        "R&D and experimental development",
        "Proof of concept and prototyping",
        "Commercialisation and market entry",
        "Scale-up activities for proven technologies",
      ],
      roundStatus: "Multiple streams open year-round — check DSDI",
      faqItems: [
        {
          q: "What are Advance Queensland's priority industries?",
          a: "Current priorities include clean energy, biomedical, agtech, digital economy, defence, and tourism. Priorities are reviewed periodically — check DSDI for the current list.",
        },
        {
          q: "Can a startup and university collaborate on an Advance Queensland grant?",
          a: "Yes — collaborative projects between businesses and research institutions are specifically encouraged and often attract higher funding amounts.",
        },
      ],
    },
  },
  wa: {
    "collab-vouchers": {
      stateLabel: "Western Australia",
      programLabel: "Collaboration Vouchers WA",
      fundingMax: "$50,000",
      fundingSourced: "2026-03-01",
      fundingStalesAt: "2027-01-01",
      description:
        "Western Australia's Collaboration Vouchers fund research collaborations between WA businesses and universities or research agencies. The voucher is co-funded — the business contributes 50%, the grant covers the rest — and is designed to solve a real business challenge using university expertise.",
      eligibility: [
        "Western Australian business with ABN",
        "Annual revenue under $75M",
        "Project must involve a WA university or CSIRO",
        "Project must have a defined business problem to solve",
      ],
      eligibleCosts: [
        "University or research organisation time and expertise",
        "Laboratory access and equipment use",
        "Research-related travel between partner sites",
        "Direct project costs agreed in the collaboration plan",
      ],
      roundStatus: "Regular intakes — check DIT WA",
      faqItems: [
        {
          q: "Which WA universities are eligible?",
          a: "UWA, Curtin, Edith Cowan, Murdoch, and Notre Dame are all eligible, plus CSIRO's Perth facilities.",
        },
        {
          q: "Can the $50,000 be used across multiple collaborations?",
          a: "No — each voucher funds a single collaboration project with one research partner. You may apply for subsequent vouchers after completing the first.",
        },
      ],
    },
  },
  sa: {
    "sa-techvoucher": {
      stateLabel: "South Australia",
      programLabel: "SA Technology Voucher Program",
      fundingMax: "$10,000",
      fundingSourced: "2026-03-01",
      fundingStalesAt: "2027-01-01",
      description:
        "SA's Technology Voucher Program provides small South Australian businesses with access to expert technology advice and implementation support. The voucher offsets the cost of working with an approved technology provider to adopt new digital, advanced manufacturing, or clean technology solutions.",
      eligibility: [
        "SA-registered business with fewer than 50 full-time employees",
        "Annual revenue under $10M",
        "Project uses an approved SA Technology Voucher service provider",
        "Business has not previously received a Technology Voucher",
      ],
      eligibleCosts: [
        "Technology advisory and assessment services",
        "Software implementation and integration",
        "Advanced manufacturing technology adoption",
        "Cybersecurity assessment and remediation",
      ],
      roundStatus: "Subject to funding availability — check DITTE SA",
      faqItems: [
        {
          q: "How do I find an approved service provider?",
          a: "DITTE SA maintains a register of approved Technology Voucher service providers. Only services from listed providers are eligible — check their website for the current register.",
        },
        {
          q: "Is the SA Tech Voucher stackable with federal grants?",
          a: "Yes — you can combine the voucher with Commonwealth R&D Tax Incentive or EMDG as long as the grants fund different activities or costs.",
        },
      ],
    },
  },
  tas: {
    "tas-entrepreneur-fund": {
      stateLabel: "Tasmania",
      programLabel: "Tasmanian Entrepreneur Fund",
      fundingMax: "$30,000",
      fundingSourced: "2026-03-01",
      fundingStalesAt: "2027-01-01",
      description:
        "The Tasmanian Entrepreneur Fund supports early-stage Tasmanian businesses with grants to develop, test, and grow innovative products or services. It is particularly accessible for founders transitioning from employment to entrepreneurship who are based in Tasmania.",
      eligibility: [
        "Tasmanian resident or business with ABN",
        "Developing a new product, service, or process",
        "Business has been trading for fewer than 3 years",
        "Not currently in receipt of other State Government business grants",
      ],
      eligibleCosts: [
        "Product development and prototyping",
        "Market research and validation",
        "Business plan development and advisory",
        "IP protection costs",
      ],
      roundStatus: "Periodic — check Business Tasmania",
      faqItems: [
        {
          q: "Can an online-only business apply?",
          a: "Yes — digital businesses are eligible. The founder or primary operations must be based in Tasmania.",
        },
        {
          q: "Does Tasmania have programs for agribusiness?",
          a: "Yes — the Department of Natural Resources and Environment Tasmania has separate agri-innovation programs. The Entrepreneur Fund covers adjacent agtech businesses.",
        },
      ],
    },
  },
  act: {
    "act-innovation-fund": {
      stateLabel: "Australian Capital Territory",
      programLabel: "ACT Innovation Connect Fund",
      fundingMax: "$50,000",
      fundingSourced: "2026-03-01",
      fundingStalesAt: "2027-01-01",
      description:
        "The ACT Innovation Connect Fund supports Canberra-based businesses to collaborate with researchers at ANU, UC, and UNSW Canberra to develop innovative solutions. The focus is on deep-tech, digital government, defence technology, and health innovation given the ACT's proximity to federal agencies.",
      eligibility: [
        "ACT-registered business with ABN",
        "Collaborative project with an ACT university or research body",
        "Genuine commercialisation pathway within 24 months",
        "50% business co-contribution required",
      ],
      eligibleCosts: [
        "Collaborative R&D with an ACT research partner",
        "Technology feasibility assessments",
        "Prototype development under a formal collaboration agreement",
        "IP filing costs arising from the collaboration",
      ],
      roundStatus: "Annual intake — check ACTTEDD",
      faqItems: [
        {
          q: "Is the ACT Innovation Connect Fund open to defence-adjacent businesses?",
          a: "Yes — defence technology is an explicit priority given the ACT's proximity to Defence headquarters and the Australian Signals Directorate.",
        },
        {
          q: "Can sole traders apply?",
          a: "Individual researchers and sole traders may apply, but must demonstrate a commercialisation pathway and a formal collaboration with a research institution.",
        },
      ],
    },
  },
  nt: {
    "nt-business-innovation": {
      stateLabel: "Northern Territory",
      programLabel: "NT Business Innovation Program",
      fundingMax: "$40,000",
      fundingSourced: "2026-03-01",
      fundingStalesAt: "2027-01-01",
      description:
        "The NT Business Innovation Program assists Northern Territory businesses to develop, test, and adopt innovative products, processes, and services. Given the NT's unique economic context — remote logistics, indigenous enterprise, and resources-sector adjacency — the program takes a flexible approach to eligible activities.",
      eligibility: [
        "NT-registered business with ABN",
        "Developing or adopting a new product, service, or process",
        "NT-based operations and primary employment impact in the NT",
        "Business has been operating for at least 12 months",
      ],
      eligibleCosts: [
        "New product and service development",
        "Technology adoption projects",
        "Remote-logistics innovation",
        "Indigenous enterprise development activities",
      ],
      roundStatus: "Subject to funding — check NT DCIT",
      faqItems: [
        {
          q: "Are resources-sector businesses eligible?",
          a: "Yes — resources and mining-adjacent businesses are eligible, particularly those developing new processing, safety, or remote-operations technology.",
        },
        {
          q: "Is indigenous enterprise development a priority?",
          a: "Yes — the NT program explicitly supports indigenous enterprises and ventures with significant indigenous employment. Dedicated pathways may exist within the program.",
        },
      ],
    },
  },
};

// ─── Static params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  const params: { slug: string; program: string }[] = [];
  for (const [state, programs] of Object.entries(STATE_PROGRAM_MAP)) {
    for (const program of Object.keys(programs)) {
      params.push({ slug: state, program });
    }
  }
  return params;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ slug: string; program: string }> };

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: state, program } = await params;
  const cfg = STATE_PROGRAM_MAP[state]?.[program];
  if (!cfg) return { title: "Not found" };
  return {
    title: `${cfg.programLabel} ${CURRENT_YEAR}: ${cfg.stateLabel} Grant Guide | Invest.com.au`,
    description: `${cfg.programLabel} — eligibility, funding amounts, and how to apply. ${cfg.stateLabel} government grant for ${CURRENT_YEAR}.`,
    alternates: { canonical: `${SITE_URL}/grants/${state}/${program}` },
    openGraph: {
      title: `${cfg.programLabel} ${CURRENT_YEAR}`,
      description: cfg.description.slice(0, 200),
      url: `${SITE_URL}/grants/${state}/${program}`,
      type: "website",
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StateGrantProgramPage({ params }: Props) {
  const { slug: state, program } = await params;
  const cfg = STATE_PROGRAM_MAP[state]?.[program];
  if (!cfg) notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Grants", url: absoluteUrl("/startup/grants") },
    { name: cfg.stateLabel },
    { name: cfg.programLabel },
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

  const isOpen = cfg.roundStatus === "Open";

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
        <nav className="text-sm text-slate-400 mb-6 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-slate-600">
            Home
          </Link>
          <span>›</span>
          <Link href="/startup/grants" className="hover:text-slate-600">
            Grants
          </Link>
          <span>›</span>
          <span className="text-slate-600">{cfg.stateLabel}</span>
          <span>›</span>
          <span className="text-slate-600">{cfg.programLabel}</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <span
            className={`text-xs font-bold px-2 py-1 rounded ${
              isOpen
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {cfg.roundStatus.toUpperCase()}
          </span>
          <span className="text-xs text-slate-500">{cfg.stateLabel} Government</span>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {cfg.programLabel} {CURRENT_YEAR}
          </h1>
          <p className="mt-3 text-slate-600">{cfg.description}</p>
        </header>

        <div className="mb-8 bg-slate-50 border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 mb-1">Maximum funding</p>
          <p className="text-3xl font-bold text-slate-900">
            <DatedStatBadge
              value={cfg.fundingMax}
              sourcedAt={cfg.fundingSourced}
              stalesAt={cfg.fundingStalesAt}
              source={`${cfg.stateLabel} Government program guide`}
            />
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Eligibility</h2>
          <ul className="space-y-2">
            {cfg.eligibility.map((item) => (
              <li key={item} className="flex items-start gap-2 text-slate-600 text-sm">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Eligible costs</h2>
          <ul className="space-y-2">
            {cfg.eligibleCosts.map((item) => (
              <li key={item} className="flex items-start gap-2 text-slate-600 text-sm">
                <span className="text-blue-500 mt-0.5">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {cfg.deadline && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Deadline</h2>
            <p className="text-slate-600 text-sm">{cfg.deadline}</p>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Frequently asked questions
          </h2>
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
            Get help with your grant application
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Grant applications are time-consuming. A specialist can assess your eligibility, write
            the application, and maximise your chance of success — often on a success-fee basis.
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
