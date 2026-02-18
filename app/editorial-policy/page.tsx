import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Editorial Policy — ${SITE_NAME}`,
  description:
    "Our commitment to editorial integrity, content accuracy, and transparent financial product coverage. Learn how we research, verify, and review brokers.",
  alternates: { canonical: "/editorial-policy" },
  openGraph: {
    title: `Editorial Policy — ${SITE_NAME}`,
    description:
      "Our commitment to editorial integrity, content accuracy, and transparent financial product coverage.",
    url: absoluteUrl("/editorial-policy"),
  },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Editorial Policy" },
]);

export default function EditorialPolicyPage() {
  return (
    <div className="py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="container-custom max-w-3xl">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-green-700">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-green-700">Editorial Policy</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
          Editorial Policy
        </h1>
        <p className="text-base sm:text-lg text-slate-600 mb-10 leading-relaxed">
          Our commitment to editorial integrity, content accuracy, and
          transparent financial product coverage.
        </p>

        <div className="space-y-10">
          {/* 1. Introduction */}
          <section>
            <h2 className="text-xl font-bold mb-3">
              Our Commitment to Editorial Integrity
            </h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              {SITE_NAME} exists to help Australians make better-informed
              decisions about share trading platforms and investment products.
              Every piece of content we publish is held to the same standard:
              accurate, up-to-date, and free from undue commercial influence.
            </p>
            <p className="text-slate-700 leading-relaxed">
              We earn revenue through affiliate partnerships, but our editorial
              team operates independently from our commercial relationships.
              Affiliate revenue never determines our ratings, rankings, or
              recommendations.
            </p>
          </section>

          {/* 2. How We Make Money */}
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-3 text-amber-900">
              How We Make Money
            </h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              We earn commissions when you open an account through our affiliate
              links. This is how we fund the site and keep it free to use.
              Importantly:
            </p>
            <ul className="space-y-2 mb-4">
              <li className="flex items-start gap-2 text-slate-700">
                <span className="text-amber-600 font-bold mt-0.5">1.</span>
                Affiliate status does not influence our ratings or rankings.
              </li>
              <li className="flex items-start gap-2 text-slate-700">
                <span className="text-amber-600 font-bold mt-0.5">2.</span>
                We include brokers without affiliate deals if they merit
                coverage.
              </li>
              <li className="flex items-start gap-2 text-slate-700">
                <span className="text-amber-600 font-bold mt-0.5">3.</span>
                We clearly label affiliate links on every page.
              </li>
            </ul>
            <Link
              href="/how-we-earn"
              className="text-amber-700 font-semibold hover:underline text-sm"
            >
              Read the full disclosure &rarr;
            </Link>
          </section>

          {/* 3. How Ratings Work */}
          <section className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-3 text-green-900">
              How Our Ratings Work
            </h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Every broker is scored across six weighted factors:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { factor: "Fees & Costs", weight: "30%" },
                { factor: "Platform Quality", weight: "20%" },
                { factor: "Safety & Trust", weight: "20%" },
                { factor: "Product Range", weight: "15%" },
                { factor: "Ease of Use", weight: "10%" },
                { factor: "Extras & Support", weight: "5%" },
              ].map((item) => (
                <div
                  key={item.factor}
                  className="bg-white border border-green-100 rounded-lg p-3 text-center"
                >
                  <div className="text-lg font-bold text-green-700">
                    {item.weight}
                  </div>
                  <div className="text-xs text-slate-600">{item.factor}</div>
                </div>
              ))}
            </div>
            <Link
              href="/methodology"
              className="text-green-700 font-semibold hover:underline text-sm"
            >
              Full methodology breakdown &rarr;
            </Link>
          </section>

          {/* 4. How We Verify Fees */}
          <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-3 text-blue-900">
              How We Verify Fees
            </h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Fee data is sourced directly from broker pricing pages. We follow a
              4-step verification process:
            </p>
            <ol className="space-y-2 mb-4">
              {[
                "Source fees from official pricing pages",
                "Cross-check against product disclosure statements",
                "Hash-check pages for changes weekly",
                "Flag and update when changes are detected",
              ].map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-slate-700"
                >
                  <span className="text-blue-600 font-bold mt-0.5">
                    {i + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <Link
              href="/how-we-verify"
              className="text-blue-700 font-semibold hover:underline text-sm"
            >
              Full fee verification process &rarr;
            </Link>
          </section>

          {/* 5. Corrections Policy */}
          <section>
            <h2 className="text-xl font-bold mb-3">Corrections Policy</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              We take accuracy seriously. If you spot an error:
            </p>
            <ul className="space-y-2 mb-4">
              <li className="flex items-start gap-2 text-slate-700">
                <span className="text-green-600 mt-0.5">&#10003;</span>
                Email{" "}
                <a
                  href="mailto:editorial@invest.com.au"
                  className="text-green-700 font-medium hover:underline"
                >
                  editorial@invest.com.au
                </a>{" "}
                with the page URL and a description of the error.
              </li>
              <li className="flex items-start gap-2 text-slate-700">
                <span className="text-green-600 mt-0.5">&#10003;</span>
                Our target is to investigate and fix factual errors within 48
                hours.
              </li>
              <li className="flex items-start gap-2 text-slate-700">
                <span className="text-green-600 mt-0.5">&#10003;</span>
                Significant corrections are logged in the article changelog
                (visible in the author byline area).
              </li>
              <li className="flex items-start gap-2 text-slate-700">
                <span className="text-green-600 mt-0.5">&#10003;</span>
                Minor typographical fixes are made silently.
              </li>
            </ul>
          </section>

          {/* 6. Conflicts Policy */}
          <section>
            <h2 className="text-xl font-bold mb-3">Conflicts of Interest</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              We manage conflicts of interest through the following rules:
            </p>
            <ul className="space-y-2 mb-4">
              <li className="flex items-start gap-2 text-slate-700">
                <span className="text-green-600 mt-0.5">&#10003;</span>
                Contributors must disclose any personal holdings in brokers or
                products they cover.
              </li>
              <li className="flex items-start gap-2 text-slate-700">
                <span className="text-green-600 mt-0.5">&#10003;</span>
                Individual disclosure statements appear on each contributor
                profile page.
              </li>
              <li className="flex items-start gap-2 text-slate-700">
                <span className="text-green-600 mt-0.5">&#10003;</span>
                Writers do not receive performance-based bonuses tied to
                affiliate revenue.
              </li>
              <li className="flex items-start gap-2 text-slate-700">
                <span className="text-green-600 mt-0.5">&#10003;</span>
                Affiliate relationships are disclosed on every page that
                contains outbound links.
              </li>
            </ul>
          </section>

          {/* 7. Content Standards */}
          <section>
            <h2 className="text-xl font-bold mb-3">Content Standards</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Every article and review follows these standards:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  Writer &amp; Reviewer Separation
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Writers research and draft content. An independent reviewer
                  validates fee claims, checks compliance, and signs off before
                  publication. Both are credited on the page.
                </p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  Fact-Checking
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Fee data is verified against primary sources. Claims are
                  cross-referenced with product disclosure statements and
                  regulatory filings where available.
                </p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  Update Cadence
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Fee pages are hash-checked weekly. Evergreen guides are
                  reviewed quarterly. Time-sensitive content (e.g. best broker
                  lists) is updated when broker offerings change.
                </p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  General Advice Warning
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We provide general information only. Content on this site does
                  not constitute personal financial advice. Always consider your
                  own circumstances and seek professional advice if needed.
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-2">Questions?</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have questions about our editorial process, corrections, or
              content standards, contact us at{" "}
              <a
                href="mailto:editorial@invest.com.au"
                className="text-green-700 font-medium hover:underline"
              >
                editorial@invest.com.au
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
