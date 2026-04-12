import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = {
  title: "Data Collection Methodology — What We Collect",
  description:
    "How Invest.com.au collects, verifies, and presents factual comparison data for Australian investing platforms — fees, features, provider details, and data sources.",
  openGraph: {
    title: "Data Collection Methodology",
    description:
      "How Invest.com.au collects, verifies, and presents factual comparison data for Australian investing platforms — fees, features, provider details, and data sources.",
    images: [
      {
        url: "/api/og?title=Data+Collection+Methodology&subtitle=What+Data+We+Collect&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: { canonical: "/methodology" },
  twitter: { card: "summary_large_image" as const },
};

const DATA_FIELDS = [
  {
    name: "Fees & Costs",
    description:
      "ASX brokerage, US brokerage, FX markup, inactivity fees, account fees, and any other disclosed charges.",
    details: [
      { label: "Low", range: "$0\u2013$5 per trade" },
      { label: "Medium", range: "$5\u2013$15 per trade" },
      { label: "High", range: "$15+ per trade" },
    ],
  },
  {
    name: "Platform & Features",
    description:
      "Available order types, charting tools, mobile app availability, research tools, and educational resources.",
    details: null,
  },
  {
    name: "Safety & Regulation",
    description:
      "CHESS sponsorship (shares held in your name on ASX subregister vs custodial model), ASIC regulation status, client fund segregation.",
    details: null,
  },
  {
    name: "Product Range",
    description:
      "ASX shares, US/international shares, ETFs, options, crypto, managed funds, and SMSF support availability.",
    details: null,
  },
  {
    name: "Account Details",
    description:
      "Minimum deposit requirements, account opening process, supported funding methods, and customer support channels.",
    details: null,
  },
  {
    name: "Additional Features",
    description:
      "Fractional shares, dividend reinvestment plans (DRP), auto-invest options, and current sign-up offers.",
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
      <div className="py-5 md:py-12">
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
              <h1 className="text-2xl md:text-4xl font-extrabold mb-4">
                What Data We Collect
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                {SITE_NAME} is a factual comparison and directory service. We
                collect and present publicly available data across six
                categories so you can sort and filter based on your own
                priorities. We do not rate, rank, or recommend any platform.
              </p>
            </section>

            {/* Data Fields Collected */}
            <section className="mb-12">
              <h2 className="text-2xl font-extrabold text-brand mb-6">
                The 6 Data Categories
              </h2>
              <div className="space-y-4">
                {DATA_FIELDS.map((cat) => (
                  <div
                    key={cat.name}
                    className="border border-slate-200 rounded-xl p-5 bg-white"
                  >
                    <div className="flex items-start gap-4">
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

            {/* Key Definitions */}
            <section className="mb-12">
              <h2 className="text-2xl font-extrabold text-brand mb-3">
                Key Definitions
              </h2>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed text-slate-700 space-y-4">
                <p>
                  <strong>CHESS-sponsored:</strong> Shares are held in your name
                  on the ASX CHESS subregister. You receive a unique Holder
                  Identification Number (HIN) and retain direct legal ownership.
                </p>
                <p>
                  <strong>Custodial model:</strong> The broker holds shares on
                  your behalf under an omnibus account. You do not appear on the
                  ASX subregister directly.
                </p>
                <p>
                  <strong>Minimum deposit:</strong> The smallest amount a
                  platform requires to open an account and begin trading.
                </p>
                <p>
                  <strong>Promoted / Sponsored:</strong> A listing where the
                  provider has paid for increased visibility. Promoted
                  placements are always clearly labelled and displayed
                  separately from factual comparison data.
                </p>
              </div>
            </section>

            {/* How Users Can Sort and Filter */}
            <section className="mb-12">
              <h2 className="text-2xl font-extrabold text-brand mb-3">
                How You Can Sort and Filter
              </h2>
              <div className="bg-brand text-white rounded-xl p-6 md:p-8 leading-relaxed space-y-4">
                <p>
                  Our comparison tables present factual data that you control.
                  We do not rank or recommend platforms. You decide what matters
                  most.
                </p>
                <ul className="space-y-2 text-slate-100">
                  <li className="flex items-start gap-3">
                    <span className="text-amber font-bold shrink-0 mt-0.5">
                      &#10003;
                    </span>
                    <span>
                      Sort by any column — fees, minimum deposit, product range,
                      or account type.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber font-bold shrink-0 mt-0.5">
                      &#10003;
                    </span>
                    <span>
                      Filter by features such as CHESS sponsorship, crypto
                      availability, or SMSF support.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber font-bold shrink-0 mt-0.5">
                      &#10003;
                    </span>
                    <span>
                      Advertising and referral fees may be received from some
                      listed businesses.{" "}
                      <Link
                        href="/how-we-earn"
                        className="text-amber hover:underline"
                      >
                        Learn how we earn
                      </Link>
                      .
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Data Sources and Verification */}
            <section className="mb-12">
              <h2 className="text-2xl font-extrabold text-brand mb-3">
                Data Sources and Verification
              </h2>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed text-slate-700 space-y-4">
                <p>
                  We collect factual data from the following sources:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Provider websites and published pricing pages</li>
                  <li>Product Disclosure Statements (PDS) and Target Market Determinations (TMD)</li>
                  <li>ASIC Professional Registers and AFSL registers</li>
                  <li>ASX public data (including CHESS participant lists)</li>
                  <li>ATO and AUSTRAC public registers where relevant</li>
                </ul>
                <p>
                  Fee data is manually verified on a <strong>monthly basis</strong> against
                  each broker&apos;s published pricing page and PDS documents. When a
                  provider notifies us of a fee change, we update within 5 business days.
                </p>
                <p>
                  For the full details on our verification process and update cadence,
                  see our dedicated page.
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
