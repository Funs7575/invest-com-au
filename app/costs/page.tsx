import Link from "next/link";
import type { Metadata } from "next";
import { getAllCostScenarios } from "@/lib/cost-scenarios";
import { absoluteUrl, breadcrumbJsonLd, REVIEW_AUTHOR } from "@/lib/seo";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Broker Cost Calculator — Real Fee Comparisons by Scenario",
  description:
    "See exactly what Australian brokers cost for your trading style. Brokerage, FX fees, and inactivity charges calculated for real scenarios.",
  alternates: { canonical: "/costs" },
  openGraph: {
    title: "Broker Cost Calculator — Real Fee Comparisons",
    description: "See what brokers actually cost for your trading style.",
    url: absoluteUrl("/costs"),
  },
};

const scenarioIcons: Record<string, string> = {
  "10-trades-month": "trending-up",
  "us-shares-5000": "globe",
  "beginner-500": "target",
  "monthly-dca-1000": "calendar",
  "us-shares-monthly": "dollar-sign",
};

export default function CostsHub() {
  const scenarios = getAllCostScenarios();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Cost Comparisons" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Cost Comparisons</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            What Do Brokers Really Cost?
          </h1>
          <p className="text-slate-600 mb-8 max-w-2xl">
            Stop guessing. We calculate the real annual cost of every Australian broker
            for specific trading scenarios — using verified fees, not marketing claims.
            Pick the scenario closest to your investing style.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {scenarios.map((s, idx) => (
              <Link
                key={s.slug}
                href={`/costs/${s.slug}`}
                className={`group block p-5 border border-slate-200 rounded-xl hover:border-slate-700 hover:shadow-md transition-all${
                  scenarios.length % 2 !== 0 && idx === scenarios.length - 1
                    ? " md:col-span-2 md:max-w-md md:mx-auto"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    name={scenarioIcons[s.slug] || "calculator"}
                    size={24}
                    className="text-slate-700 shrink-0 mt-0.5"
                  />
                  <div>
                    <h2 className="text-lg font-bold group-hover:text-slate-900 transition-colors">
                      {s.h1}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {s.inputs.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Want a personalised calculation?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Enter your exact trading habits and portfolio size for a custom fee breakdown.
            </p>
            <Link
              href="/fee-impact"
              className="inline-block px-6 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
            >
              Personal Fee Calculator →
            </Link>
          </div>

          {/* E-E-A-T footer */}
          <div className="mt-8 text-xs text-slate-400 text-center">
            <p>
              All costs calculated using verified broker fees by{" "}
              <a href={REVIEW_AUTHOR.url} className="underline hover:text-slate-900">
                {REVIEW_AUTHOR.name}
              </a>
              .{" "}
              <Link href="/methodology" className="underline hover:text-slate-900">
                Our methodology
              </Link>{" "}
              &middot;{" "}
              <Link href="/how-we-earn" className="underline hover:text-slate-900">
                How we earn money
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
