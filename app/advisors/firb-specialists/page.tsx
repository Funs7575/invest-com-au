import { createClient } from "@/lib/supabase/server";
import type { Professional } from "@/lib/types";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import AdvisorsClient from "../AdvisorsClient";

export const revalidate = 1800;

const PAGE_TITLE = "FIRB Specialists in Australia";
const PAGE_DESCRIPTION =
  "Find qualified advisors specialising in Foreign Investment Review Board (FIRB) approvals. Covering residential property, agricultural land, business acquisitions, and foreign ownership structures.";

const FAQS = [
  {
    q: "What is the Foreign Investment Review Board (FIRB)?",
    a: "The Foreign Investment Review Board (FIRB) is the Australian government body that reviews proposed foreign investments in Australia. FIRB advises the Treasurer on whether proposed investments comply with Australia's Foreign Acquisitions and Takeovers Act 1975 and national interest considerations.",
  },
  {
    q: "Who needs FIRB approval?",
    a: "Generally, 'foreign persons' — including temporary residents, non-residents, and foreign entities — need FIRB approval to: purchase residential property; acquire certain agricultural land; make significant business acquisitions above threshold values; and acquire interests in sensitive sectors (media, telecommunications, defence-adjacent businesses).",
  },
  {
    q: "What are the FIRB thresholds for residential property?",
    a: "Temporary residents can purchase one established dwelling as a principal place of residence (with conditions) and new dwellings without limit. Foreign persons generally cannot purchase established residential dwellings. For new dwellings, no monetary threshold applies — FIRB notification is required. Residential land purchases also require notification regardless of price.",
  },
  {
    q: "How long does FIRB approval take?",
    a: "The standard processing period is 30 days from the date of application, but FIRB can extend this period up to 130 days (and sometimes longer for complex or sensitive transactions). It is essential to apply early and not exchange contracts without approval (or a condition precedent).",
  },
  {
    q: "What does FIRB approval cost?",
    a: "FIRB charges an application fee (paid to the ATO) based on the investment value. For residential property purchases, fees range from $4,200 to $105,000+. For business acquisitions, fees are calculated differently. Specialist advisory fees for FIRB applications are additional, typically $3,000–$15,000+.",
  },
  {
    q: "What happens if I don't get FIRB approval when required?",
    a: "Failure to obtain required FIRB approval is a serious offence. Penalties include substantial fines (up to $157,500 for individuals) and divestiture orders requiring you to sell the asset. The ATO actively audits foreign property ownership and has broad powers to investigate non-compliance.",
  },
];

const EDITORIAL = {
  howToChoose: [
    "Ensure the specialist has direct experience with FIRB applications in your investment category: residential property, agricultural land, or business acquisitions",
    "Ask about their success rate and average processing times — experienced specialists know how to structure applications to avoid unnecessary delays",
    "Check if they can advise on the full lifecycle: pre-purchase structuring, FIRB application, conditions compliance, and ongoing reporting obligations",
    "Confirm they stay current with FIRB policy changes — threshold amounts and processing requirements change regularly",
    "For business acquisitions, look for specialists with corporate law backgrounds alongside FIRB expertise",
  ],
  costGuide:
    "FIRB advisory fees typically start at $3,000–$5,000 for straightforward residential property applications. Complex business acquisitions or agricultural land transactions requiring detailed national interest analysis can cost $10,000–$50,000+ in advisory fees, on top of the statutory FIRB application fee charged by the ATO.",
  industryInsight:
    "FIRB scrutiny has increased significantly since 2020, with the Australian government expanding the scope of reviewable transactions and reducing approval thresholds. In 2024–25, FIRB received over 40,000 applications, with residential property representing the majority. Foreign investors increasingly rely on specialist advisors to navigate complex conditions attached to approvals.",
};

export const metadata: Metadata = {
  title: `FIRB Specialists Australia (${CURRENT_YEAR}) — Foreign Investment Review Board Advisors`,
  description: PAGE_DESCRIPTION,
  openGraph: {
    title: "FIRB Specialists",
    description: PAGE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/advisors/firb-specialists" },
};

export default async function FIRBSpecialistsPage() {
  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professionals")
    .select("*")
    .eq("status", "active")
    .eq("firb_specialist", true)
    .order("verified", { ascending: false })
    .order("rating", { ascending: false });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "FIRB Specialists" },
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
