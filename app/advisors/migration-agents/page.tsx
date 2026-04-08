import { createClient } from "@/lib/supabase/server";
import type { Professional } from "@/lib/types";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import AdvisorsClient from "../AdvisorsClient";

export const revalidate = 1800;

const PAGE_TITLE = "Registered Migration Agents in Australia";
const PAGE_DESCRIPTION =
  "Find MARA-registered migration agents across Australia. Specialists in investor visas (188/888), skilled migration, employer-sponsored visas, partner visas, and permanent residency pathways.";

const FAQS = [
  {
    q: "What is a Registered Migration Agent (RMA)?",
    a: "A Registered Migration Agent (RMA) is a professional registered with the Migration Agents Registration Authority (MARA) who is legally authorised to provide immigration assistance and advice in Australia. Only RMAs, legal practitioners (solicitors/barristers), and members of parliament can charge for immigration advice in Australia.",
  },
  {
    q: "What is the Business Innovation and Investment Program (BIIP)?",
    a: "The Business Innovation and Investment Program (BIIP) is a stream of the Business Talent Visa (subclass 188 and 888) designed for investors and business people who want to establish or manage a business in Australia. It includes the Significant Investor stream ($5M+ in complying investments), Premium Investor stream ($15M+), Business Innovation stream, Investor stream, and Entrepreneur stream.",
  },
  {
    q: "How much investment is required for an Australian investor visa?",
    a: "The Significant Investor Visa (SIV, subclass 188C) requires a minimum $5 million invested in complying investments for at least 4 years. The Business Innovation stream requires a business with turnover of at least $750,000 and personal assets of $1.25M. Requirements vary significantly by stream.",
  },
  {
    q: "How long does a migration agent take to process an investor visa?",
    a: "Processing times for investor visas (subclass 188/888) are typically 12–36 months depending on the stream and state nomination. State nomination rounds open periodically and have their own selection criteria. Working with an experienced agent significantly improves your chances of state nomination.",
  },
  {
    q: "What is the difference between a migration agent and an immigration lawyer?",
    a: "In Australia, both can provide immigration advice and prepare visa applications. Migration agents must be MARA-registered; immigration lawyers are solicitors with immigration law expertise. For complex cases involving judicial review or appeals to the AAT, an immigration lawyer with litigation experience may be preferable.",
  },
  {
    q: "Can a migration agent also advise on Australian tax and FIRB?",
    a: "Migration agents specialise in visa law but typically do not provide tax or FIRB advice — those require a registered tax agent and potentially a FIRB specialist respectively. For investor visa applications, you'll often need a team: migration agent + international tax advisor + financial planner + potentially FIRB specialist.",
  },
];

const EDITORIAL = {
  howToChoose: [
    "Verify their MARA registration at the Migration Agents Registration Authority website (mara.gov.au) — this is a non-negotiable requirement",
    "Ask specifically about their experience with your visa subclass — investor visas (188/888) require specialists, as the state nomination process is highly competitive",
    "Check if they have direct relationships with state and territory government nomination programs, as this can significantly affect your chances",
    "Ensure they understand the investment requirements in detail: complying investments, managed funds criteria, and reporting obligations",
    "For investor streams, confirm they can coordinate with financial planners and tax advisors as part of a complete investor migration strategy",
  ],
  costGuide:
    "Migration agent fees for investor visa applications typically range from $5,000–$20,000+ depending on visa complexity, state nomination assistance, and the number of applicants. This is separate from the DIBP visa application charge ($10,000–$14,000 for the 188 subclass). State nomination fees are additional (typically $500–$5,000 per state).",
  industryInsight:
    "Australia's investor visa program has been significantly reformed in recent years, with state governments taking an increasingly active role in selection. Competition for state nominations — particularly in NSW, Victoria, and Queensland — is intense. The most successful applicants work with specialist agents who have up-to-date knowledge of each state's nomination priorities and selection criteria.",
};

export const metadata: Metadata = {
  title: `Registered Migration Agents Australia (${CURRENT_YEAR}) — Investor & Skilled Visas`,
  description: PAGE_DESCRIPTION,
  openGraph: {
    title: "Migration Agents",
    description: PAGE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/advisors/migration-agents" },
};

export default async function MigrationAgentsPage() {
  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professionals")
    .select("*")
    .eq("status", "active")
    .eq("migration_agent", true)
    .order("verified", { ascending: false })
    .order("rating", { ascending: false });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "Migration Agents" },
  ]);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <AdvisorsClient
        professionals={(professionals as Professional[]) || []}
        pageTitle={PAGE_TITLE}
        pageDescription={PAGE_DESCRIPTION}
        faqs={FAQS}
        editorial={EDITORIAL}
      />
    </>
  );
}
