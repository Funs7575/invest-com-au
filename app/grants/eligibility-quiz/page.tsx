import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import EligibilityQuizClient from "./EligibilityQuizClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Grants Eligibility Quiz: Which Australian Grants Can You Claim? | Invest.com.au",
  description:
    "Answer 5 quick questions and get a personalised list of Australian grants you likely qualify for — with estimated dollar values for each.",
  alternates: { canonical: `${SITE_URL}/grants/eligibility-quiz` },
  openGraph: {
    title: "Grants Eligibility Quiz: Which Australian Grants Can You Claim?",
    description: "Personalised grant eligibility — 5 questions, estimated dollar values.",
    url: `${SITE_URL}/grants/eligibility-quiz`,
    type: "website",
  },
};

export default function EligibilityQuizPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Grants", url: absoluteUrl("/grants") },
    { name: "Eligibility Quiz", url: absoluteUrl("/grants/eligibility-quiz") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">Which grants is your business eligible for?</h1>
            <p className="text-slate-300">Five quick questions. We&rsquo;ll show you a personalised list with estimated dollar values for each program.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <EligibilityQuizClient />
          </div>
        </section>
      </div>
    </>
  );
}
