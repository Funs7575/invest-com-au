import { createClient } from "@/lib/supabase/server";
import type { Professional } from "@/lib/types";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import AdvisorsClient from "../AdvisorsClient";

export const revalidate = 1800;

const PAGE_TITLE = "Registered Migration Agents in Australia";
const PAGE_DESCRIPTION =
  "Find MARA-registered migration agents across Australia. Specialists in investor visas (188/888), skilled migration, employer-sponsored visas, partner visas, and permanent residency pathways.";

const FAQS = [
  {
    q: "What does an Australian migration agent do, and how do they differ from an immigration lawyer?",
    a: "A Registered Migration Agent (RMA) is authorised to provide immigration advice, prepare visa applications, and represent clients before the Administrative Review Tribunal. An immigration lawyer is a solicitor with immigration law expertise who can also handle judicial review and court appeals. For straightforward visa applications, an RMA is typically sufficient; for complex cases involving litigation or criminal character matters, an immigration lawyer with litigation experience may be preferable.",
  },
  {
    q: "What are the MARA registration requirements for Australian migration agents?",
    a: "Migration agents must be registered with the Migration Agents Registration Authority (MARA) to legally charge for immigration advice in Australia. Registration requires a migration law qualification, a passing score on the MARA registration skills assessment, a clean police and character check, and professional indemnity insurance. MARA registration must be renewed annually. You can verify any agent's registration number at the MARA public register at mara.gov.au.",
  },
  {
    q: "What visa types do migration agents typically handle in Australia?",
    a: "Australian migration agents handle a wide range of visas including: skilled migration (subclass 189, 190, 491); employer-sponsored visas (482 TSS, 186 ENS); business and investor visas (subclass 188/888 including the Significant Investor stream); partner and family visas; student visas; and permanent residency pathways. Specialist agents often focus on investor and skilled visas, which are more complex and carry higher financial stakes.",
  },
  {
    q: "How much do migration agents charge in Australia?",
    a: "Migration agent fees vary widely by visa type and complexity. Skilled visa applications (subclass 189/190) typically cost $3,000–$5,000 in agent fees. Employer-sponsored visas run $3,500–$8,000. Investor and business visas (subclass 188/888) are the most complex, with agent fees ranging from $8,000–$20,000 or more, on top of the government visa application charge ($10,000–$14,000 for the 188 subclass). Always get a written fee agreement before engaging.",
  },
  {
    q: "How do I verify a migration agent's MARA registration?",
    a: "You can verify any migration agent's registration at the MARA public register at mara.gov.au — search by name, company, or registration number. A valid registration shows a current expiry date and no disciplinary findings. Be cautious of anyone who cannot provide a MARN (Migration Agent Registration Number) — providing paid immigration advice without MARA registration is a criminal offence in Australia carrying penalties of up to 10 years imprisonment.",
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

  const faqLd = faqJsonLd(FAQS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
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
