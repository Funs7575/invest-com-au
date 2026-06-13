import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import PathwayFinderClient from "./PathwayFinderClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Funding Pathway Finder: How Should Your Business Raise Capital? | Invest.com.au",
  description:
    "Answer 10 quick questions and get a ranked, honest comparison of your business funding pathways — grants, debt, equity crowdfunding, angels, VC, bootstrapping or sale.",
  alternates: { canonical: `${SITE_URL}/raise/pathway-finder` },
  openGraph: {
    title: "Funding Pathway Finder: How Should Your Business Raise Capital?",
    description:
      "10 questions. A ranked, honest comparison of grants, debt, equity crowdfunding, angels, VC, bootstrapping and sale — with eligibility facts for each.",
    url: `${SITE_URL}/raise/pathway-finder`,
    type: "website",
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Business Funding Pathway Finder")}&sub=${encodeURIComponent("Grants · Debt · Equity Crowdfunding · Angels · VC · Sale")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function PathwayFinderPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Raise", url: absoluteUrl("/raise") },
    { name: "Pathway Finder", url: absoluteUrl("/raise/pathway-finder") },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-3xl">
            <p className="text-xs uppercase tracking-wider font-extrabold text-amber-400 mb-2">
              Funding Pathway Finder
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">
              How should your business raise capital?
            </h1>
            <p className="text-slate-300">
              Ten quick questions. We&rsquo;ll rank the seven funding pathways for your
              situation — with the eligibility facts and honest trade-offs of each. No sign-up
              needed; your answers stay on your device.
            </p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <PathwayFinderClient />
          </div>
        </section>
      </div>
    </>
  );
}
