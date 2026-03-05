import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import {
  AFCA_REFERENCE,
  EDITORIAL_ACCURACY_COMMITMENT,
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
  REGULATORY_NOTE,
} from "@/lib/compliance";

export const metadata = {
  title: "Complaints & Dispute Resolution",
  description:
    "How to resolve complaints about financial products listed on Invest.com.au. Contact the provider, escalate to AFCA, or report content issues to our editorial team.",
  alternates: { canonical: "/complaints" },
  openGraph: {
    title: "Complaints & Dispute Resolution — Invest.com.au",
    description:
      "How to resolve complaints about financial products listed on Invest.com.au. AFCA dispute resolution and editorial corrections process.",
    images: [
      {
        url: "/api/og?title=Complaints+%26+Dispute+Resolution&subtitle=AFCA+%7C+Editorial+Corrections+%7C+Consumer+Protection&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

export default function ComplaintsPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "About", url: absoluteUrl("/about") },
    { name: "Complaints & Dispute Resolution" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="py-8 md:py-12">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <div className="text-xs md:text-sm text-slate-500 mb-5 md:mb-6">
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <span className="mx-1.5 md:mx-2">/</span>
              <Link href="/about" className="hover:text-slate-900">
                About
              </Link>
              <span className="mx-1.5 md:mx-2">/</span>
              <span className="text-slate-700">Complaints</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold mb-3 md:mb-4">
              Complaints & Dispute Resolution
            </h1>
            <p className="text-sm md:text-base text-slate-600 mb-6 md:mb-8 leading-relaxed">
              We are committed to transparency and fair treatment. This page explains how
              to raise a complaint about a financial product listed on Invest.com.au, how
              to report inaccurate content, and how to access free external dispute
              resolution through AFCA.
            </p>

            {/* Section 1: Complaints about a financial product/service */}
            <section className="mb-8 md:mb-10">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-3">
                1. Complaints About a Financial Product or Service
              </h2>
              <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                Invest.com.au is a comparison and information service — we do not issue
                financial products, hold your money, or execute trades. If you have a
                complaint about a specific financial product or service (e.g. brokerage
                fees, account access, trading issues), your first step should be to
                contact the provider directly.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mb-4">
                <h3 className="text-sm font-bold text-slate-800 mb-2">
                  Step-by-step resolution process:
                </h3>
                <ol className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <div>
                      <strong>Contact the provider directly</strong>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Use the provider&apos;s internal complaints process. They are
                        required to have one under their AFSL (Australian Financial
                        Services Licence) conditions.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <strong>Allow 30 days for a response</strong>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ASIC requires AFSL holders to respond to complaints within 30
                        calendar days (or 21 days for superannuation complaints).
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <strong>Escalate to AFCA if unresolved</strong>
                      <p className="text-xs text-slate-500 mt-0.5">
                        If the provider does not resolve your complaint, or you are
                        unhappy with their response, you can lodge a complaint with the
                        Australian Financial Complaints Authority (AFCA).
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </section>

            {/* Section 2: AFCA */}
            <section className="mb-8 md:mb-10">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-3">
                2. Australian Financial Complaints Authority (AFCA)
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-5 mb-4">
                <p className="text-sm text-blue-800 leading-relaxed mb-3">
                  {AFCA_REFERENCE}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="font-bold text-blue-800 mb-1">Online</p>
                    <a
                      href="https://www.afca.org.au/make-a-complaint"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline hover:text-blue-900"
                    >
                      afca.org.au/make-a-complaint
                    </a>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="font-bold text-blue-800 mb-1">Phone</p>
                    <p className="text-blue-700">1800 931 678 (free call)</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="font-bold text-blue-800 mb-1">Email</p>
                    <a
                      href="mailto:info@afca.org.au"
                      className="text-blue-700 underline hover:text-blue-900"
                    >
                      info@afca.org.au
                    </a>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                AFCA is a free, independent dispute resolution scheme approved by ASIC.
                All AFSL holders and AUSTRAC-registered digital currency exchanges are
                required to be members. AFCA can consider complaints about banking,
                insurance, investments, superannuation, and financial advice.
              </p>
            </section>

            {/* Section 3: Content complaints */}
            <section className="mb-8 md:mb-10">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-3">
                3. Report Inaccurate or Misleading Content
              </h2>
              <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                If you believe any information on Invest.com.au is incorrect, outdated,
                or misleading, please let us know immediately.
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-5 mb-4">
                <p className="text-sm text-emerald-800 leading-relaxed mb-3">
                  {EDITORIAL_ACCURACY_COMMITMENT}
                </p>
                <div className="bg-white rounded-lg p-3 border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-800 mb-1">
                    Report a content issue
                  </p>
                  <a
                    href="mailto:corrections@invest.com.au"
                    className="text-sm text-emerald-700 underline hover:text-emerald-900"
                  >
                    corrections@invest.com.au
                  </a>
                  <p className="text-xs text-emerald-600 mt-1">
                    Include the URL, what appears incorrect, and the correct information
                    (with source if possible). We aim to review and action all reports
                    within 48 hours.
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                We take content accuracy seriously, especially for Your Money Your Life
                (YMYL) financial content. All corrections are logged in our article
                changelogs for full transparency.
              </p>
            </section>

            {/* Section 4: Complaints about Invest.com.au */}
            <section className="mb-8 md:mb-10">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-3">
                4. Complaints About Invest.com.au
              </h2>
              <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                If you have a complaint about how we operate — including our comparison
                methodology, advertising practices, or how we handle your data — please
                contact us directly.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <p className="font-bold text-slate-800 mb-1">Email</p>
                    <a
                      href="mailto:complaints@invest.com.au"
                      className="text-blue-700 underline hover:text-blue-900"
                    >
                      complaints@invest.com.au
                    </a>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 mb-1">Company Details</p>
                    <p className="text-xs text-slate-600">
                      {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN}, ABN {COMPANY_ABN})
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {REGULATORY_NOTE}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5: ASIC */}
            <section className="mb-8 md:mb-10">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-3">
                5. Reporting to ASIC
              </h2>
              <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                If you believe a financial services provider is acting unlawfully or
                you want to report suspected misconduct, you can report directly to the
                Australian Securities and Investments Commission (ASIC).
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-800 mb-1">ASIC Report Centre</p>
                    <a
                      href="https://asic.gov.au/about-asic/contact-us/how-to-complain/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline hover:text-blue-900"
                    >
                      asic.gov.au/contact-us/how-to-complain
                    </a>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 mb-1">ASIC Infoline</p>
                    <p className="text-slate-700">1300 300 630</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  ASIC does not resolve individual disputes (that is AFCA&apos;s role),
                  but they investigate systemic issues and misconduct by AFSL holders.
                </p>
              </div>
            </section>

            {/* Related links */}
            <div className="border-t border-slate-200 pt-6 md:pt-8">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Related Pages</h3>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/how-we-earn"
                  className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  How We Earn →
                </Link>
                <Link
                  href="/editorial-policy"
                  className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  Editorial Policy →
                </Link>
                <Link
                  href="/privacy"
                  className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  Privacy Policy →
                </Link>
                <Link
                  href="/reviews"
                  className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  Platform Reviews →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
