import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const metadata = {
  title: "How We Score Brokers — Our Methodology",
  description:
    "Our transparent 6-factor weighted scoring system rates every Australian broker on fees, platform quality, safety, product range, UX, and extras.",
  openGraph: {
    title: `How We Score Brokers — ${SITE_NAME}`,
    description:
      "Our transparent 6-factor weighted scoring system rates every Australian broker on fees, platform quality, safety, product range, UX, and extras.",
    images: [
      {
        url: "/api/og?title=How+We+Score+Brokers&subtitle=Our+Transparent+Rating+Methodology&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: { canonical: "/methodology" },
};

const CATEGORIES = [
  {
    name: "Fees & Costs",
    weight: "30%",
    description:
      "ASX brokerage, US brokerage, FX markup, inactivity fees, and hidden charges.",
    details: [
      { label: "Low", range: "$0\u2013$5 per trade" },
      { label: "Medium", range: "$5\u2013$15 per trade" },
      { label: "High", range: "$15+ per trade" },
    ],
  },
  {
    name: "Platform & Features",
    weight: "20%",
    description:
      "Charting tools, mobile app quality, order types, research tools, and education.",
    details: null,
  },
  {
    name: "Safety & Regulation",
    weight: "20%",
    description:
      "CHESS sponsorship, ASIC regulation, client fund segregation, and compensation schemes.",
    details: null,
  },
  {
    name: "Product Range",
    weight: "15%",
    description:
      "ASX shares, US shares, ETFs, options, crypto, and SMSF support.",
    details: null,
  },
  {
    name: "User Experience",
    weight: "10%",
    description:
      "Account opening speed, funding methods, and customer support quality.",
    details: null,
  },
  {
    name: "Value Extras",
    weight: "5%",
    description:
      "Fractional shares, DRP, auto-invest, and sign-up offers.",
    details: null,
  },
];

export default function MethodologyPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Methodology" },
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
              <span className="text-brand">Methodology</span>
            </div>

            {/* Hero */}
            <section className="mb-12">
              <h1 className="text-4xl font-extrabold mb-4">
                How We Score Brokers
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                Every broker on {SITE_NAME} is rated using the same transparent,
                weighted methodology. Six categories, clear weights, no
                backroom deals. Here&apos;s exactly how we arrive at every score.
              </p>
            </section>

            {/* Scoring Categories */}
            <section className="mb-12">
              <h2 className="text-2xl font-extrabold text-brand mb-6">
                The 6 Scoring Categories
              </h2>
              <div className="space-y-4">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat.name}
                    className="border border-slate-200 rounded-xl p-5 bg-white"
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-14 h-14 rounded-lg bg-brand/10 flex items-center justify-center">
                        <span className="text-brand font-extrabold text-sm">
                          {cat.weight}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-lg">
                          {cat.name}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {cat.description}
                        </p>
                        {cat.details && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {cat.details.map((d) => (
                              <span
                                key={d.label}
                                className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 rounded-full px-3 py-1"
                              >
                                <span className="font-semibold">
                                  {d.label}:
                                </span>
                                {d.range}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* How We Calculate the Final Score */}
            <section className="mb-12">
              <h2 className="text-2xl font-extrabold text-brand mb-3">
                How We Calculate the Final Score
              </h2>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed text-slate-700 space-y-4">
                <p>
                  Each category is scored individually out of 5. The final score
                  is the <strong>weighted sum</strong> of all six categories,
                  normalised to a <strong>5-point scale</strong>.
                </p>
                <p className="font-mono text-sm bg-white border border-slate-200 rounded-lg p-4 text-slate-800">
                  Final Score = (Fees &times; 0.30) + (Platform &times; 0.20) +
                  (Safety &times; 0.20) + (Range &times; 0.15) + (UX &times;
                  0.10) + (Extras &times; 0.05)
                </p>
                <p>
                  A broker that scores perfectly across the board would receive a
                  5.0. In practice, most brokers score between 3.0 and 4.5.
                </p>
              </div>
            </section>

            {/* Editorial Independence */}
            <section className="mb-12">
              <h2 className="text-2xl font-extrabold text-brand mb-3">
                Editorial Independence
              </h2>
              <div className="bg-brand text-white rounded-xl p-6 md:p-8 leading-relaxed space-y-4">
                <p>
                  Our scores are editorial. One reviewer scores each broker
                  using the same rubric. We do not accept payment to change
                  scores.
                </p>
                <ul className="space-y-2 text-slate-100">
                  <li className="flex items-start gap-3">
                    <span className="text-amber font-bold shrink-0 mt-0.5">
                      &#10003;
                    </span>
                    <span>
                      Every broker is reviewed with the same criteria, whether
                      they have a commercial relationship with us or not.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber font-bold shrink-0 mt-0.5">
                      &#10003;
                    </span>
                    <span>
                      We earn money through affiliate links, but commissions
                      never influence rankings.{" "}
                      <Link
                        href="/how-we-earn"
                        className="text-amber hover:underline"
                      >
                        Learn how we earn
                      </Link>
                      .
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber font-bold shrink-0 mt-0.5">
                      &#10003;
                    </span>
                    <span>
                      Scores are updated whenever a broker changes its fee
                      structure or platform offering.
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* How We Verify Fee Data */}
            <section className="mb-12">
              <h2 className="text-2xl font-extrabold text-brand mb-3">
                How We Verify Fee Data
              </h2>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed text-slate-700 space-y-4">
                <p>
                  Fee data is the single biggest input to our scoring model. We
                  manually verify every fee figure against each broker&apos;s
                  published pricing page and PDS documents.
                </p>
                <p>
                  For the full details on our verification process, data
                  sources, and update cadence, see our dedicated page.
                </p>
              </div>
            </section>

            {/* CTA */}
            <div className="text-center">
              <Link
                href="/how-we-verify"
                className="inline-block px-8 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Read how we verify fee data &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
