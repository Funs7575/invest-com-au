import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import {
  GENERAL_ADVICE_WARNING,
  ADVERTISER_DISCLOSURE,
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
} from "@/lib/compliance";

export const metadata = {
  title: "Terms of Use",
  description: "Terms of use for Invest.com.au",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Terms of Use" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="py-12">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <div className="text-sm text-slate-500 mb-6">
              <Link href="/" className="hover:text-brand">
                Home
              </Link>
              <span className="mx-2">/</span>
              <span className="text-brand">Terms of Use</span>
            </div>

            <h1 className="text-4xl font-extrabold mb-8">Terms of Use</h1>

            <div className="space-y-6">
              {/* 1. Scope of Service */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">1. Scope of Service</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN}, ABN {COMPANY_ABN}),
                  trading as {SITE_NAME}, is an information service that provides
                  comparisons, reviews, and educational content about Australian
                  investment platforms. We are not a financial product issuer,
                  credit provider, or financial adviser.
                </p>
              </section>

              {/* 2. General Advice Warning */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">
                  2. General Advice Warning
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {GENERAL_ADVICE_WARNING}
                </p>
              </section>

              {/* 3. Accuracy & Completeness */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">
                  3. Accuracy &amp; Completeness
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  While we strive to keep all information accurate and up to
                  date, we cannot guarantee the completeness or accuracy of
                  information on this site. Fee data is verified periodically
                  &mdash; see our{" "}
                  <Link
                    href="/about"
                    className="text-green-700 hover:text-green-800 underline"
                  >
                    verification process
                  </Link>
                  . Always verify information with the product issuer before
                  making a decision.
                </p>
              </section>

              {/* 4. Affiliate Relationships */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">
                  4. Affiliate Relationships
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {ADVERTISER_DISCLOSURE}
                </p>
              </section>

              {/* 5. Limitation of Liability */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">
                  5. Limitation of Liability
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  To the maximum extent permitted by law, {SITE_NAME} and its
                  contributors shall not be liable for any loss or damage arising
                  from your use of this site or reliance on information contained
                  herein.
                </p>
              </section>

              {/* 6. User Responsibilities */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">
                  6. User Responsibilities
                </h2>
                <p className="text-sm text-slate-600 mb-2 leading-relaxed">
                  By using this site, you agree to:
                </p>
                <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1 leading-relaxed">
                  <li>Use the site for lawful purposes only.</li>
                  <li>
                    Not scrape, reproduce, or redistribute content without
                    written permission.
                  </li>
                  <li>
                    Verify information independently with the product issuer
                    before making financial decisions.
                  </li>
                </ul>
              </section>

              {/* 7. Intellectual Property */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">
                  7. Intellectual Property
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  All content, design, and branding on this site is owned by{" "}
                  {SITE_NAME}. You may not reproduce, distribute, or create
                  derivative works from any material on this site without our
                  prior written consent.
                </p>
              </section>

              {/* 8. Governing Law */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">8. Governing Law</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  These terms are governed by the laws of Australia.
                </p>
              </section>

              {/* 9. Changes to Terms */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">
                  9. Changes to Terms
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We may update these terms from time to time. Continued use of
                  the site constitutes acceptance of any changes.
                </p>
              </section>

              {/* 10. Contact */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">10. Contact</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Questions about these terms? Email us at{" "}
                  <a
                    href="mailto:hello@invest.com.au"
                    className="text-green-700 hover:text-green-800 underline"
                  >
                    hello@invest.com.au
                  </a>
                  .
                </p>
              </section>
            </div>

            {/* Privacy Policy Link */}
            <div className="mt-10 text-center">
              <Link
                href="/privacy"
                className="text-green-700 font-semibold hover:underline"
              >
                Read our Privacy Policy &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
