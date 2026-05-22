import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import SmsfChecklistClient from "./SmsfChecklistClient";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "SMSF Compliance Checklist: 12 Items Trustees Must Track | Invest.com.au",
  description:
    "Interactive SMSF compliance checklist — setup, ongoing and review obligations. Tick each item as you complete it and email yourself the result.",
  alternates: { canonical: `${SITE_URL}/smsf/checklist` },
  openGraph: {
    title: "SMSF Compliance Checklist: 12 Items Trustees Must Track",
    description: "Setup, ongoing and review obligations — interactive and printable.",
    url: `${SITE_URL}/smsf/checklist`,
    type: "website",
  },
};

export default function SmsfChecklistPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Compliance Checklist", url: absoluteUrl("/smsf/checklist") },
  ]);

  const smsfChecklistFaqLd = faqJsonLd([
    {
      q: "What are the annual obligations of an SMSF trustee?",
      a: "Key annual obligations: lodge an SMSF annual return with the ATO (due 31 October for self-lodgers, or February/May via a tax agent); arrange an independent audit by an ASIC-registered SMSF auditor; pay the ATO's SMSF supervisory levy; review and document the investment strategy; value all assets at market value at 30 June; keep trustee meeting minutes; and ensure all benefit payments comply with preservation and condition-of-release rules. Failure to lodge on time triggers administrative penalties and may prompt ATO compliance action.",
    },
    {
      q: "How much does an SMSF audit cost?",
      a: "A standard SMSF audit by a registered auditor costs $300–$700 for straightforward funds (shares, cash, term deposits). Complex funds holding direct property, collectables, related-party loans, or LRBA structures can cost $800–$1,500+ due to additional compliance work. Auditor fees have broadly increased since 2020 due to higher ATO enforcement and regulatory complexity. The audit must be completed before the SMSF annual return is lodged — trustees are responsible for appointing an auditor at least 45 days before the return due date.",
    },
    {
      q: "Can I use my SMSF before I retire?",
      a: "Generally no — superannuation is preserved until you meet a condition of release. For most Australians, the conditions are: turning 65 (regardless of employment status), or reaching preservation age (55–60 depending on year of birth) and retiring permanently from the workforce. Some limited early release conditions exist: permanent incapacity, terminal medical condition, severe financial hardship (limited amount), or compassionate grounds. Illegal early access to super is heavily penalised — the amount is included in your assessable income plus a 20% penalty, totalling potential tax of 47%+.",
    },
    {
      q: "What records does an SMSF trustee need to keep?",
      a: "SMSF trustees must keep: all trustee declarations (signed within 21 days of appointment), trust deed, investment strategy, minutes of trustee meetings, accounting records and financial statements for at least 5 years, and records of SMSF annual returns and ATO correspondence for at least 5 years. Evidence of all asset valuations (particularly for property, unlisted assets, and collectables) must be retained. For LRBA property, the bare trust deed, loan agreement, and all loan repayment records must be kept for the life of the arrangement plus 5 years.",
    },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(smsfChecklistFaqLd) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">SMSF Compliance Checklist</h1>
            <p className="text-slate-300">12 items every SMSF trustee should tick off — setup, ongoing and annual review.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <SmsfChecklistClient />
          </div>
        </section>

        <section className="py-12 bg-white border-t border-slate-200">
          <div className="container-custom max-w-2xl">
            <AdvisorPrompt
              type="smsf_accountant"
              heading="Work through your SMSF checklist with an expert"
            />
          </div>
        </section>
      </div>
    </>
  );
}
