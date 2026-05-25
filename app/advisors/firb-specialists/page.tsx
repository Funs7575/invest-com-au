import { createClient } from "@/lib/supabase/server";
import type { Professional } from "@/lib/types";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import AdvisorsClient from "../AdvisorsClient";

export const revalidate = 1800;

const PAGE_TITLE = "FIRB Specialists in Australia";
const PAGE_DESCRIPTION =
  "Find qualified advisors specialising in Foreign Investment Review Board (FIRB) approvals. Covering residential property, agricultural land, business acquisitions, and foreign ownership structures.";

const FAQS = [
  {
    q: "What is FIRB and who needs approval to invest in Australia?",
    a: "The Foreign Investment Review Board (FIRB) is the Australian government body that reviews proposed foreign investments in Australia. Generally, 'foreign persons' — including temporary residents, non-residents, and foreign entities — need FIRB approval to purchase residential property, acquire certain agricultural land, make significant business acquisitions above threshold values, and invest in sensitive sectors such as telecommunications, media, and defence-adjacent businesses.",
  },
  {
    q: "What are the FIRB application fees for residential property?",
    a: "FIRB application fees for residential property are set by legislation and scale with property value. As a guide, the fee for a property up to $1 million is $14,100. Fees increase in bands: $28,200 for properties $1M–$2M, $56,400 for $2M–$3M, and so on up to $1.1M+ for very high-value transactions. These fees are paid to the ATO at the time of application and are non-refundable. Specialist advisory fees are additional.",
  },
  {
    q: "What types of investment require FIRB approval in Australia?",
    a: "FIRB approval is required for: residential property purchases by most foreign persons and temporary residents (new dwellings require notification; established dwellings are generally prohibited for non-residents); agricultural land acquisitions above $15M cumulative; business acquisitions above relevant monetary thresholds ($330M for general business, lower for sensitive sectors and foreign government investors); and acquisitions of interests in sensitive sectors such as media, telecommunications, infrastructure, and defence-adjacent businesses.",
  },
  {
    q: "How long does a FIRB application take to process?",
    a: "The statutory processing period is 30 days from receipt of the application, and straightforward residential property cases are often approved within this window. However, FIRB can extend the period up to 130 days for more complex transactions. Sensitive-sector business acquisitions and national security reviews can take 6–9 months. Always apply early — do not exchange contracts without FIRB approval (or a condition precedent covering FIRB approval).",
  },
  {
    q: "Do Australian citizens living overseas need FIRB approval to buy property in Australia?",
    a: "No. Australian citizens are not 'foreign persons' under the Foreign Acquisitions and Takeovers Act, regardless of where they live. They can purchase property in Australia — including established dwellings — without FIRB approval. Australian permanent residents are also exempt. However, temporary visa holders and non-resident foreign nationals do require approval and face restrictions on purchasing established dwellings.",
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
