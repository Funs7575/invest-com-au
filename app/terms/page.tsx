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

  const S = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
      <h2 className="text-lg font-bold mb-2">{n}. {title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="py-5 md:py-12">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="text-sm text-slate-500 mb-6">
              <Link href="/" className="hover:text-brand">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-brand">Terms of Use</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold mb-2">Terms of Use</h1>
            <p className="text-xs text-slate-400 mb-8">Version 1.1 — Last updated 18 March 2026</p>

            <div className="space-y-6">
              <S n={1} title="Scope of Service">
                <p>
                  {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN}, ABN {COMPANY_ABN}),
                  trading as {SITE_NAME}, is an information service that provides
                  comparisons, reviews, and educational content about Australian
                  investment platforms, financial advisors, and property investment.
                  We are not a financial product issuer, credit provider, financial
                  adviser, mortgage broker, or real estate agent.
                </p>
              </S>

              <S n={2} title="General Advice Warning">
                <p>{GENERAL_ADVICE_WARNING}</p>
              </S>

              <S n={3} title="Accuracy &amp; Completeness">
                <p>
                  While we strive to keep all information accurate and up to date, we
                  cannot guarantee the completeness or accuracy of information on this
                  site. Suburb data, property prices, loan rates, and platform fee data
                  are indicative only and subject to change. Always verify information
                  with the product issuer, developer, or lender before making a
                  decision.
                </p>
              </S>

              <S n={4} title="Affiliate Relationships">
                <p>{ADVERTISER_DISCLOSURE}</p>
              </S>

              <S n={5} title="Limitation of Liability">
                <p>
                  To the maximum extent permitted by law, {SITE_NAME} and its
                  contributors shall not be liable for any loss or damage arising
                  from your use of this site or reliance on information contained
                  herein, including investment losses, property transaction losses,
                  or decisions made based on comparison data, suburb statistics,
                  or advisor referrals.
                </p>
                <p className="text-xs text-slate-500 border-l-2 border-amber-300 pl-3 mt-2">
                  <strong>Australian Consumer Law:</strong> Nothing in these Terms
                  excludes, restricts, or modifies any right or remedy, or any
                  guarantee, warranty, or other term or condition, implied or imposed
                  by the Australian Consumer Law (Schedule 2 to the Competition and
                  Consumer Act 2010 (Cth)) that cannot lawfully be excluded or
                  limited. Our liability for a failure to comply with a consumer
                  guarantee under the Australian Consumer Law is limited, to the
                  extent permitted by law, to re-supplying the services or paying
                  the cost of having the services re-supplied.
                </p>
              </S>

              <S n={6} title="User Responsibilities">
                <p>By using this site, you agree to:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Use the site for lawful purposes only.</li>
                  <li>
                    Not scrape, reproduce, or redistribute content without written
                    permission.
                  </li>
                  <li>
                    Verify information independently with the product issuer before
                    making financial decisions.
                  </li>
                </ul>
              </S>

              <S n={7} title="User-Generated Content">
                <p>
                  This site allows users to submit reviews of financial advisors
                  and platforms, and allows verified advisors to publish articles
                  (&quot;User Content&quot;). By submitting User Content, you:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Grant us a licence</strong> to publish, display, edit,
                    and remove your User Content for the purposes of operating and
                    improving the site.
                  </li>
                  <li>
                    <strong>Warrant</strong> that your User Content is truthful,
                    based on genuine experience, not defamatory, and does not
                    infringe any third-party rights (including intellectual property
                    rights).
                  </li>
                  <li>
                    <strong>Acknowledge</strong> that we may moderate, edit, or
                    remove User Content at our discretion, including content that
                    is misleading, offensive, or in breach of these Terms.
                  </li>
                  <li>
                    <strong>Understand</strong> that reviews must reflect a genuine
                    experience with the reviewed advisor or platform, and that
                    submitting false or incentivised reviews may constitute misleading
                    conduct under the Australian Consumer Law.
                  </li>
                </ul>
                <p>
                  We do not endorse or take responsibility for User Content and
                  accept no liability for any errors or omissions in reviews or
                  advisor-published articles.
                </p>
              </S>

              <S n={8} title="Intellectual Property">
                <p>
                  All original content, design, and branding on this site is owned
                  by {SITE_NAME}. You may not reproduce, distribute, or create
                  derivative works from any material on this site without our prior
                  written consent. User Content remains the property of the
                  submitting user, subject to the licence granted in Section 7.
                </p>
              </S>

              <S n={9} title="Governing Law &amp; Dispute Resolution">
                <p>
                  These Terms are governed by the laws of the State of Victoria,
                  Australia. You agree to submit to the non-exclusive jurisdiction
                  of the courts of Victoria.
                </p>
                <p>
                  <strong>Dispute resolution:</strong> Before commencing legal
                  proceedings, you agree to contact us at{" "}
                  <a href="mailto:hello@invest.com.au" className="underline hover:text-slate-900">
                    hello@invest.com.au
                  </a>{" "}
                  to attempt to resolve the dispute in good faith. If the dispute
                  cannot be resolved within 30 days, either party may seek
                  resolution through the courts of Victoria.
                </p>
                <p>
                  If you are a consumer with a complaint about a financial product
                  recommended or compared on this site, you may also contact the
                  Australian Financial Complaints Authority (AFCA) at{" "}
                  <a href="https://www.afca.org.au" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-900">
                    afca.org.au
                  </a>{" "}
                  or 1800 931 678. See our{" "}
                  <Link href="/complaints" className="underline hover:text-slate-900">
                    Complaints &amp; AFCA page
                  </Link>
                  .
                </p>
              </S>

              <S n={10} title="Changes to Terms">
                <p>
                  We may update these terms from time to time. Any material changes
                  will be posted on this page with an updated &quot;Last
                  updated&quot; date. Continued use of the site after changes
                  constitutes acceptance of the updated Terms.
                </p>
              </S>

              <S n={11} title="Contact">
                <p>
                  Questions about these terms? Email us at{" "}
                  <a
                    href="mailto:hello@invest.com.au"
                    className="text-slate-700 hover:text-slate-900 underline"
                  >
                    hello@invest.com.au
                  </a>
                  .
                </p>
                <p className="text-xs text-slate-500">
                  {COMPANY_LEGAL_NAME} · ACN {COMPANY_ACN} · ABN {COMPANY_ABN}
                </p>
              </S>
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/privacy"
                className="text-slate-700 font-semibold hover:underline"
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
