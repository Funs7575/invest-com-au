import type { Metadata } from "next";
import DecisionTree from "@/components/DecisionTree";
import {
  SMSF_SETUP_TREE,
  SMSF_SETUP_START_ID,
} from "@/lib/decision-trees/smsf-setup";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_NAME,
} from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Should I Set Up an SMSF? Decision Tool (${CURRENT_YEAR}) — ${SITE_NAME}`,
  description:
    "Answer 2–3 questions about your super balance, goals, and situation to find out whether setting up a self-managed super fund makes sense for you.",
  alternates: { canonical: "/tools/smsf-setup" },
  openGraph: {
    title: "Should I Set Up an SMSF? — Decision Tool",
    description:
      "Free SMSF decision tool for Australians. Covers balance thresholds, cost breakeven, business real property, and fund performance checks.",
    url: absoluteUrl("/tools/smsf-setup"),
    images: [
      {
        url: "/api/og?title=Should+I+Set+Up+an+SMSF%3F&subtitle=Interactive+Decision+Tool&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "Should I Set Up an SMSF?",
    url: absoluteUrl("/tools/smsf-setup"),
  },
]);

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much super do I need to set up an SMSF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most financial advisers recommend a minimum balance of $300,000–$500,000 for an SMSF to be cost-effective. Annual running costs (accounting, audit, ASIC fees) typically range from $2,000 to $5,000+ regardless of fund size. On a $500,000 balance, $3,000 in fees is 0.6% — competitive with many platform and retail funds.",
      },
    },
    {
      "@type": "Question",
      name: "Can an SMSF buy my business premises?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Business real property — premises used wholly and exclusively in a business — is one of the few assets an SMSF can purchase from a related party. The fund buys the property and leases it back to your business at market rent. This is a legitimate and common SMSF strategy, but it requires specialist advice to set up correctly.",
      },
    },
    {
      "@type": "Question",
      name: "Can an SMSF invest in residential property?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, but not from a related party. An SMSF can purchase residential investment property at arm's length — it just cannot be acquired from a related party (including fund members or their associates), and no member or related party can live in it or use it. The property must be held solely for the purpose of providing retirement benefits.",
      },
    },
    {
      "@type": "Question",
      name: "What does an SMSF trustee have to do?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "As an SMSF trustee you are legally responsible for the fund's compliance with superannuation law. Key obligations include maintaining a written investment strategy, keeping minutes of trustee decisions, lodging an annual return with the ATO, arranging an independent audit each year, and ensuring the fund operates solely to provide retirement benefits for members (the sole purpose test).",
      },
    },
  ],
};

const FAQS = faqLd.mainEntity;

export default function SmsfSetupPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd, faqLd]} testId="smsf-setup-jsonld" />
      <div className="py-8 md:py-12">
        <div className="container-custom max-w-2xl">
          <p className="text-xs uppercase tracking-wider font-extrabold text-amber-600 mb-3">
            Decision Tool
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Should I Set Up an SMSF?
          </h1>
          <p className="text-base text-slate-600 mb-8">
            Self-managed super funds offer investment flexibility and control —
            but they carry real costs and obligations. Answer a few questions to
            find out whether an SMSF makes sense for your situation.
          </p>

          <DecisionTree
            nodes={SMSF_SETUP_TREE}
            startId={SMSF_SETUP_START_ID}
            heading="SMSF Decision"
          />

          <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">General advice only.</strong>{" "}
            This tool provides general information and does not consider your
            personal financial situation, objectives, or needs. Superannuation
            is a complex area governed by the SIS Act. Always seek professional
            financial and legal advice before establishing or winding up an
            SMSF.
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-extrabold text-slate-900 mb-5">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.name}>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {faq.name}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {faq.acceptedAnswer.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
