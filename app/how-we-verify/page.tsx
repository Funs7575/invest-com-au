import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 86400;

export const metadata = {
  title: "How We Verify Fees — Our Data Process",
  description: `Learn how ${SITE_NAME} verifies platform fees. We cross-check pricing pages, PDSs, and T&Cs quarterly to ensure accuracy across every platform review.`,
  alternates: { canonical: "/how-we-verify" },
  openGraph: {
    title: "How We Verify Fees — Our Data Process",
    description: `Learn how ${SITE_NAME} verifies platform fees. We cross-check pricing pages, PDSs, and T&Cs quarterly to ensure accuracy across every platform review.`,
    images: [
      {
        url: "/api/og?title=How+We+Verify+Fees&subtitle=Our+Data+Verification+Process&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const HOW_WE_VERIFY_FAQS = [
  {
    q: "How often does Invest.com.au verify broker fees?",
    a: "We verify all broker fees at a minimum quarterly cadence. When a broker announces a fee change mid-quarter, we update our records immediately — as soon as the new pricing is confirmed on their official website or PDS, not at the next scheduled audit. Every verification is date-stamped so you can see exactly when data was last checked.",
  },
  {
    q: "Where does Invest.com.au get its fee data from?",
    a: "We source fee data exclusively from each broker's official pricing page, Product Disclosure Statement (PDS), and Terms & Conditions. We never rely on third-party databases, user-submitted information, or press releases as a primary source. All data is cross-checked against the PDS to catch conditional fees and discrepancies not listed on the main pricing page.",
  },
  {
    q: "Does Invest.com.au include all fee types, or just brokerage?",
    a: "We capture every published fee: brokerage commissions (per-trade or percentage), FX conversion fees, inactivity fees, platform/subscription fees, account-keeping fees, international share fees, and any conditional charges. Where a broker uses multiple pricing tiers, we record all tiers so our fee simulator and comparisons reflect the full cost picture for different usage profiles.",
  },
  {
    q: "How do verified fees influence the broker star rating?",
    a: "Verified fee data feeds directly into our weighted scoring model. Fees are scored against the full comparison set — a broker charging $29.95 per trade scores lower on the cost dimension than one charging $2. The fee score is then weighted alongside safety, product range, platform features, and user experience to produce the overall star rating. You can see the full methodology at /methodology.",
  },
];

const STEPS = [
  {
    number: 1,
    title: "Visit the platform's official pricing page",
    description:
      "We go directly to each platform's website and locate their current pricing and fee schedule. No third-party aggregators — only primary sources.",
  },
  {
    number: 2,
    title: "Record all published fees",
    description:
      "We capture every fee: brokerage commissions, FX conversion rates, inactivity fees, platform fees, account fees, and any other published charges.",
  },
  {
    number: 3,
    title: "Cross-check against PDS and T&Cs",
    description:
      "We review the Product Disclosure Statement and Terms & Conditions to identify any hidden charges, conditional fees, or discrepancies not listed on the pricing page.",
  },
  {
    number: 4,
    title: "Record the verification date and changes",
    description:
      "We log the date of each audit and note any fee changes compared to the previous verification. This creates an auditable change history for every broker.",
  },
];

export default function HowWeVerifyPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "How We Verify" },
  ]);
  const faqLd = faqJsonLd(HOW_WE_VERIFY_FAQS);

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
    />
    {faqLd && (
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    )}
    <div className="py-5 md:py-12">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-brand">How We Verify</span>
          </div>

          {/* Hero */}
          <h1 className="text-2xl md:text-4xl font-extrabold mb-4">How We Verify Fees</h1>
          <p className="text-lg text-slate-600 mb-10 leading-relaxed">
            Accurate fee data is the foundation of every comparison and review on {SITE_NAME}.
            Here&apos;s exactly how we source, verify, and maintain broker fee information.
          </p>

          {/* Data Sources */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">Data Sources</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed text-slate-700 space-y-4">
              <p>
                We source fee data from each broker&apos;s official pricing page, Product Disclosure
                Statement (PDS), and Terms &amp; Conditions. We never rely on third-party databases
                or user-submitted information as a primary source.
              </p>
              <p>
                Where a broker operates multiple fee tiers or conditional pricing, we record every
                tier so our calculators and comparisons reflect the full picture.
              </p>
            </div>
          </section>

          {/* Update Cadence */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">Update Cadence</h2>
            <div className="bg-slate-700/5 border border-slate-700/20 rounded-xl p-6 leading-relaxed text-slate-700">
              <p>
                Verified quarterly at minimum, and immediately upon known changes. When a broker
                announces a fee change, we update our records as soon as the new pricing is
                confirmed on their website — we don&apos;t wait for the next scheduled audit.
              </p>
            </div>
          </section>

          {/* 4-Step Process */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">Our 4-Step Verification Process</h2>
            <p className="text-slate-700 mb-6 leading-relaxed">
              Every fee data point on {SITE_NAME} goes through the same rigorous process:
            </p>
            <div className="space-y-4">
              {STEPS.map((step) => (
                <div
                  key={step.number}
                  className="border border-slate-200 rounded-xl p-5 flex items-start gap-4"
                >
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center">
                    <span className="text-white font-extrabold text-lg">{step.number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900">{step.title}</h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Change Log */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">Fee Change Log</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed text-slate-700 space-y-4">
              <p>
                When broker fees change, we record old and new values with dates. You can see the
                change history on each broker&apos;s review page.
              </p>
              <p>
                This transparency means you can see exactly when a fee was last verified, what it
                was before, and whether a broker has a pattern of increasing or decreasing costs
                over time.
              </p>
            </div>
          </section>

          {/* Scoring Methodology Link */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">How Fees Affect Our Scores</h2>
            <div className="border border-slate-200 rounded-xl p-6 leading-relaxed text-slate-700">
              <p>
                Fee verification is just one part of our review process. Once fees are verified,
                they feed into our weighted scoring methodology alongside platform features, safety,
                product range, and user experience.
              </p>
              <p className="mt-4">
                <Link
                  href="/methodology"
                  className="text-slate-700 font-semibold hover:underline"
                >
                  Read our full scoring methodology &rarr;
                </Link>
              </p>
            </div>
          </section>

          {/* Fee Change Alerts Signup */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 text-center">
            <h2 className="text-lg font-extrabold text-slate-900 mb-2">Get Notified of Fee Changes</h2>
            <p className="text-sm text-slate-600 mb-4">Be the first to know when broker fees change. Join our mailing list.</p>
            <Link href="/#email-capture" className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">
              Subscribe to Fee Alerts →
            </Link>
          </div>

          {/* FAQ */}
          <section className="mb-10 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {HOW_WE_VERIFY_FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                    {faq.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="bg-slate-700/5 border border-slate-700/20 rounded-xl p-6 md:p-8 text-center">
            <h3 className="font-extrabold text-xl mb-2">Find the right broker for you</h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Now that you know how we verify fees, use our tools to find the broker that
              fits your investing style and budget.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/quiz"
                className="inline-block px-8 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Take the Platform Quiz
              </Link>
              <Link
                href="/compare"
                className="inline-block px-8 py-3 border border-slate-700 text-slate-700 font-semibold rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
              >
                Compare Platforms
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
    </>
  );
}
