import { createClient } from "@/lib/supabase/server";
import type { Professional } from "@/lib/types";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import AdvisorsClient from "../AdvisorsClient";

export const revalidate = 1800;

const PAGE_TITLE = "International Tax Specialists in Australia";
const PAGE_DESCRIPTION =
  "Find qualified Australian tax advisors who specialise in international tax: double tax agreements, foreign income, expat tax returns, withholding tax, and cross-border investment structures.";

const FAQS = [
  {
    q: "What is an international tax specialist?",
    a: "An international tax specialist is a tax professional with expertise in cross-border taxation — including double tax agreements (DTAs), foreign income declaration, withholding tax, permanent establishment rules, and the tax treatment of overseas investments held by Australian residents or foreigners investing in Australia.",
  },
  {
    q: "When do I need an international tax specialist?",
    a: "You should consult an international tax specialist if you: receive income from overseas sources; hold foreign shares, property, or bank accounts; are an Australian expat living abroad; are a foreign national investing in Australia; have worked in multiple countries; or hold assets in foreign trusts or companies.",
  },
  {
    q: "How much does international tax advice cost in Australia?",
    a: "Expect $500–$1,500 for an international tax return with foreign income. Complex advice involving DTAs, foreign company structures, or FIRB matters typically costs $2,000–$8,000+. Some specialists charge hourly rates of $300–$600+.",
  },
  {
    q: "Can an international tax specialist help me avoid double taxation?",
    a: "Yes. Australia has double tax agreements (DTAs) with 45+ countries that prevent the same income from being taxed twice. A specialist ensures you claim foreign tax offsets correctly, apply DTA exemptions where applicable, and structure your affairs to minimise overall tax across jurisdictions.",
  },
  {
    q: "Do I need to declare foreign income on my Australian tax return?",
    a: "Yes. Australian tax residents are taxed on worldwide income. All foreign income — including salary, dividends, interest, rent, and capital gains — must be declared on your Australian tax return. Foreign tax paid can generally be claimed as a foreign income tax offset (FITO) to reduce double taxation.",
  },
  {
    q: "What is the Foreign Investment Review Board (FIRB) and when does it apply?",
    a: "FIRB reviews foreign investment proposals in Australia above certain thresholds. Foreign persons generally need FIRB approval to buy residential property, certain agricultural land, and business assets above threshold values. An international tax specialist or FIRB specialist can advise whether approval is required for your situation.",
  },
];

const EDITORIAL = {
  howToChoose: [
    "Verify they hold an AFSL or are a registered tax agent with the Tax Practitioners Board (TPB) — both are legal requirements for paid advice",
    "Ask about their specific experience with double tax agreements (DTAs) relevant to your countries of interest",
    "Check if they have experience with your specific situation: expat returns, foreign trust structures, PFIC rules for US citizens, or non-resident CGT",
    "Confirm they work with international clients and understand reporting obligations in multiple jurisdictions",
    "Ask whether they coordinate with overseas advisors or law firms if your situation spans multiple countries",
  ],
  costGuide:
    "International tax returns with foreign income cost $500–$1,500. Comprehensive cross-border tax planning — covering DTA analysis, foreign company structures, or FIRB matters — typically costs $2,000–$8,000+. For complex situations involving multiple jurisdictions, expect higher fees from specialists with country-specific expertise.",
  industryInsight:
    "Australia's international tax rules have become increasingly complex since the introduction of foreign income reporting requirements and the ATO's expanded data sharing with overseas tax authorities (including the US IRS, UK HMRC, and 100+ others via AEOI). Getting specialist advice has never been more important for cross-border investors.",
};

export const metadata: Metadata = {
  title: `International Tax Specialists Australia (${CURRENT_YEAR}) — Find & Compare`,
  description: PAGE_DESCRIPTION,
  openGraph: {
    title: "International Tax Specialists",
    description: PAGE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/advisors/international-tax-specialists" },
};

export default async function InternationalTaxSpecialistsPage() {
  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professionals")
    .select("*")
    .eq("status", "active")
    .eq("international_tax_specialist", true)
    .order("verified", { ascending: false })
    .order("rating", { ascending: false });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "International Tax Specialists" },
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
