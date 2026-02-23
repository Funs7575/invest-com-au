import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const metadata = {
  title: "How We Verify Fees — Our Data Process",
  description: `Learn how ${SITE_NAME} verifies broker fees. We cross-check pricing pages, PDSs, and T&Cs quarterly to ensure accuracy across every broker review.`,
  alternates: { canonical: "/how-we-verify" },
  openGraph: {
    title: "How We Verify Fees — Our Data Process",
    description: `Learn how ${SITE_NAME} verifies broker fees. We cross-check pricing pages, PDSs, and T&Cs quarterly to ensure accuracy across every broker review.`,
    images: [
      {
        url: "/api/og?title=How+We+Verify+Fees&subtitle=Our+Data+Verification+Process&type=default",
      },
    ],
  },
};

const STEPS = [
  {
    number: 1,
    title: "Visit the broker's official pricing page",
    description:
      "We go directly to each broker's website and locate their current pricing and fee schedule. No third-party aggregators — only primary sources.",
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
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-brand">How We Verify</span>
          </div>

          {/* Hero */}
          <h1 className="text-4xl font-extrabold mb-4">How We Verify Fees</h1>
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
                Take the Broker Quiz
              </Link>
              <Link
                href="/compare"
                className="inline-block px-8 py-3 border border-slate-700 text-slate-700 font-semibold rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
              >
                Compare Brokers
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
    </>
  );
}
