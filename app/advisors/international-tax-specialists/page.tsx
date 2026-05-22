import { createClient } from "@/lib/supabase/server";
import type { Professional } from "@/lib/types";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import AdvisorsClient from "../AdvisorsClient";

export const revalidate = 1800;

const PAGE_TITLE = "International Tax Specialists in Australia";
const PAGE_DESCRIPTION =
  "Find qualified Australian tax advisors who specialise in international tax: double tax agreements, foreign income, expat tax returns, withholding tax, and cross-border investment structures.";

const FAQS = [
  {
    q: "What triggers Australian tax residency for foreign investors?",
    a: "Australia uses a residency test based primarily on domicile, the 183-day rule, and the superannuation test. A foreign investor who spends 183 days or more in Australia in a tax year will generally be treated as a tax resident and taxed on their worldwide income. Even below this threshold, permanent domicile in Australia or Australian-source employment income can establish residency. An international tax specialist can assess your specific situation and advise on structuring to manage your residency status.",
  },
  {
    q: "What are the Double Tax Agreement (DTA) benefits for non-residents investing in Australia?",
    a: "Australia has Double Tax Agreements (DTAs) with 45+ countries including the US, UK, Japan, China, Singapore, and New Zealand. DTAs can reduce or eliminate Australian withholding tax on dividends, interest, and royalties paid to non-residents, prevent double taxation on business profits, and allocate taxing rights between countries. For example, under many DTAs, withholding tax on dividends is capped at 15% (rather than the standard 30%). A specialist can identify which DTA applies to your situation and structure investments to access treaty benefits.",
  },
  {
    q: "What is the CGT exemption under s855-10 for non-residents?",
    a: "Under section 855-10 of the Income Tax Assessment Act 1997, a foreign resident is generally exempt from Australian capital gains tax (CGT) on assets that are not 'taxable Australian property'. Taxable Australian property includes direct interests in Australian real estate, certain indirect interests in land-rich entities (where 80%+ of assets are Australian real property), and assets used in an Australian permanent establishment. Shares in Australian companies listed on the ASX are generally not taxable Australian property for non-residents — an important benefit compared to the treatment of direct property.",
  },
  {
    q: "What are the non-resident withholding tax rates on Australian income?",
    a: "Non-residents are subject to withholding tax on Australian-source income. The standard rates are: dividends — 30% (unfranked), 0% (fully franked); interest — 10%; royalties — 30%. These rates are often reduced under a DTA. For example, many DTAs reduce dividend withholding to 15% and royalty withholding to 10%. Income from Australian employment, business, or services is taxed at non-resident marginal rates (32.5% from the first dollar, with no tax-free threshold). An international tax specialist ensures you're applying the correct rate and claiming any DTA reduction.",
  },
  {
    q: "What is the DASP tax rate for departing Australia superannuation payments?",
    a: "A Departing Australia Superannuation Payment (DASP) is available to temporary residents who have left Australia and held a temporary visa. The DASP tax rate is 35% on the taxed element of the payment (the majority of most super balances). For Working Holiday Maker visa holders (subclass 417/462), the rate is higher at 65%. These rates apply regardless of your home country's tax treaty with Australia. Taking super before leaving Australia (or via DASP) is often less tax-effective than leaving it invested — an international tax specialist can model the trade-offs for your specific balance.",
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
