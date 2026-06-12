import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import {
  AFCA_REFERENCE,
  EDITORIAL_ACCURACY_COMMITMENT,
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
  REGULATORY_NOTE,
} from "@/lib/compliance";

export const revalidate = 86400;

export const metadata = {
  title: "Complaints & Dispute Resolution",
  description:
    "Resolve complaints about financial products on Invest.com.au: contact the provider, escalate to AFCA, or report content errors to our editorial team.",
  alternates: { canonical: "/complaints" },
  openGraph: {
    title: "Complaints & Dispute Resolution",
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

const COMPLAINTS_FAQS = [
  {
    q: "How do I make a complaint about Invest.com.au?",
    a: "Email complaints@invest.com.au with a clear description of your complaint, the date(s) it relates to, and what outcome you are seeking. We will acknowledge your complaint within 2 business days and provide a substantive response within 10 business days. If your complaint is complex and requires more time, we will notify you and provide a revised timeframe. All complaints are handled by a senior team member — we do not use automated responses for complaint resolution.",
  },
  {
    q: "What if I'm not satisfied with Invest.com.au's response?",
    a: "If you are not satisfied with how we have handled your complaint, you can escalate to the Australian Financial Complaints Authority (AFCA) — the independent external dispute resolution scheme we are a member of. AFCA can be reached at afca.org.au or 1800 931 678 and their service is free to consumers. You have the right to escalate to AFCA after 30 days if we haven't resolved your complaint, or at any time after receiving our final response if you disagree with it.",
  },
  {
    q: "What types of complaints can Invest.com.au handle?",
    a: "We can handle complaints about: (1) inaccurate or misleading information published on invest.com.au; (2) our editorial ratings, reviews, or comparisons; (3) affiliate or referral arrangements and any commercial disclosure failures; (4) data privacy issues (covered separately under our Privacy Policy at /privacy); and (5) conduct by the Invest.com.au team. We cannot resolve complaints about the platforms or advisers listed on our site — those must be directed to the platform, adviser, or their relevant EDR scheme (e.g. AFCA for financial services).",
  },
  {
    q: "Will making a complaint affect what I see on the site?",
    a: "No. Complaints are handled confidentially by our team and have no effect on the editorial ratings, rankings, or content you see on invest.com.au. In particular, a complaint from a platform or adviser about their review will not result in removal of that review unless there is a verified factual error. We maintain strict separation between our complaints process and our editorial function.",
  },
];

const complaintsFaqLd = faqJsonLd(COMPLAINTS_FAQS);

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
      {complaintsFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(complaintsFaqLd) }}
        />
      )}
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
                    <p className="font-bold text-slate-800 mb-1">Submit online</p>
                    <Link
                      href="/complaints/submit"
                      className="inline-block px-4 py-2 rounded bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800"
                    >
                      Lodge a complaint →
                    </Link>
                    <p className="text-[0.65rem] text-slate-500 mt-1">
                      Gets a reference number + email confirmation. 30-day SLA.
                    </p>
                  </div>
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

      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {COMPLAINTS_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
