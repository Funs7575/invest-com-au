import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY_LEGAL_NAME, COMPANY_ACN, COMPANY_ABN } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Legal – invest.com.au",
  description: "Terms of use, privacy policy, financial services guide, and all other legal documents for invest.com.au.",
  robots: { index: true, follow: true },
};

const documents = [
  {
    title: "Terms of Use",
    href: "/terms",
    description: "The rules governing use of invest.com.au, including subscription terms, refund policy, and limitations of liability.",
    updated: "18 March 2026",
    version: "v1.2",
  },
  {
    title: "Privacy Policy",
    href: "/privacy",
    description: "How we collect, use, store and protect your personal information under the Australian Privacy Act 1988.",
    updated: "18 March 2026",
    version: "v1.3",
  },
  {
    title: "Financial Services Guide",
    href: "/fsg",
    description: "Our licensing status, the nature of information provided on this site, and where to seek personalised financial advice.",
    updated: "18 March 2026",
    version: null,
  },
  {
    title: "How We Earn",
    href: "/how-we-earn",
    description: "Full transparency on our revenue model — affiliate commissions, advisor referral fees, and what we don't do.",
    updated: "18 March 2026",
    version: null,
  },
  {
    title: "Editorial Policy",
    href: "/editorial-policy",
    description: "Our standards for independence, accuracy, and how commercial relationships are kept separate from editorial ratings.",
    updated: "18 March 2026",
    version: null,
  },
  {
    title: "Methodology",
    href: "/methodology",
    description: "How we research, score, and rank platforms, super funds, and advisors.",
    updated: "18 March 2026",
    version: null,
  },
  {
    title: "Complaints & Dispute Resolution",
    href: "/complaints",
    description: "How to raise a complaint with us, and how to escalate to AFCA or ASIC if needed.",
    updated: "18 March 2026",
    version: null,
  },
];

const partnerDocuments = [
  {
    title: "Broker & Platform Listing Terms",
    href: "/broker-terms",
    description: "Terms for financial platforms listed on or advertising through invest.com.au.",
    updated: "10 March 2026",
    version: "v1.0",
  },
  {
    title: "Advisor Services Agreement",
    href: "/advisor-terms",
    description: "Terms for financial advisors, mortgage brokers, and accountants listed on our advisor directory.",
    updated: "10 March 2026",
    version: "v1.0",
  },
  {
    title: "Advertiser & Affiliate Terms",
    href: "/advertiser-terms",
    description: "Terms for affiliate partners and display advertisers on invest.com.au.",
    updated: "16 March 2026",
    version: "v1.0",
  },
  {
    title: "Developer & Buyer's Agent Terms",
    href: "/developer-terms",
    description: "Terms for property developers and buyer's agents listing on our property hub.",
    updated: "18 March 2026",
    version: "v1.0",
  },
];

export default function LegalPage() {
  return (
    <div className="pt-8 pb-16 md:py-16">
      <div className="container-custom max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">Legal</h1>
        <p className="text-slate-500 mb-8">
          All legal documents for invest.com.au, operated by {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN} | ABN {COMPANY_ABN}).
        </p>

        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Consumer Documents</h2>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {documents.map((doc) => (
              <Link
                key={doc.href}
                href={doc.href}
                className="flex items-start justify-between gap-4 px-5 py-4 bg-white hover:bg-slate-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors text-sm md:text-base">
                    {doc.title}
                  </p>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5 leading-relaxed">{doc.description}</p>
                  <p className="text-[0.65rem] text-slate-400 mt-1">
                    Last updated: {doc.updated}{doc.version ? ` · ${doc.version}` : ""}
                  </p>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Partner & Commercial Documents</h2>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {partnerDocuments.map((doc) => (
              <Link
                key={doc.href}
                href={doc.href}
                className="flex items-start justify-between gap-4 px-5 py-4 bg-white hover:bg-slate-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors text-sm md:text-base">
                    {doc.title}
                  </p>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5 leading-relaxed">{doc.description}</p>
                  <p className="text-[0.65rem] text-slate-400 mt-1">
                    Last updated: {doc.updated}{doc.version ? ` · ${doc.version}` : ""}
                  </p>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        <p className="text-xs text-slate-400 mt-8 text-center">
          Questions about these documents?{" "}
          <Link href="/contact" className="underline hover:text-slate-600">Contact us</Link> or{" "}
          <Link href="/complaints" className="underline hover:text-slate-600">lodge a complaint</Link>.
        </p>
      </div>
    </div>
  );
}
