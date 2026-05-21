import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import {
  API_TIERS,
  API_TIER_CONFIG,
  isPurchasableTier,
  type ApiTier,
} from "@/lib/api-tiers";
import UpgradeForm from "./UpgradeForm";

export const metadata: Metadata = {
  title: "API Plans & Pricing | Invest.com.au",
  description:
    "Upgrade your Invest.com.au Data API key. Free, Basic and Pro tiers with higher rate limits for financial planners, advisers, and fintech developers.",
  alternates: { canonical: `${SITE_URL}/developers/api/billing` },
  openGraph: {
    title: "API Plans & Pricing | Invest.com.au",
    description:
      "Higher rate limits for the Invest.com.au broker Data API. Self-serve subscription billing.",
  },
};

// Pricing + rate-limit catalogue is static; whether a tier is purchasable
// depends on server-only env (Stripe price ids), so render dynamically.
export const dynamic = "force-dynamic";

function priceLabel(tier: ApiTier): string {
  const cfg = API_TIER_CONFIG[tier];
  if (cfg.priceMonthly === null) return "Contact sales";
  if (cfg.priceMonthly === 0) return "Free";
  return `A$${cfg.priceMonthly}`;
}

export default function ApiBillingPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "API Plans" },
  ]);

  // Resolve purchasability server-side — `isPurchasableTier` reads the
  // STRIPE_PRICE_ID_API_* env vars which aren't available in the browser.
  const purchasable = (["basic", "pro"] as const)
    .filter((t) => isPurchasableTier(t))
    .map((t) => ({
      tier: t,
      label: API_TIER_CONFIG[t].label,
      priceMonthly: API_TIER_CONFIG[t].priceMonthly ?? 0,
    }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="py-5 md:py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb */}
          <div className="mb-6 text-sm text-slate-500">
            <Link href="/" className="hover:text-brand">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/api-docs" className="hover:text-brand">
              API
            </Link>
            <span className="mx-2">/</span>
            <span className="text-brand">Plans</span>
          </div>

          {/* Header */}
          <h1 className="mb-3 text-2xl font-extrabold md:text-4xl">
            API plans &amp; pricing
          </h1>
          <p className="mb-8 max-w-2xl text-lg leading-relaxed text-slate-600">
            The Invest.com.au Data API serves verified Australian broker fees,
            comparisons, and fee-change history. Start free, then upgrade for
            higher rate limits as your integration grows.
          </p>

          {/* Tier cards */}
          <section className="mb-12">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {API_TIERS.map((tier) => {
                const cfg = API_TIER_CONFIG[tier];
                const highlight = tier === "pro";
                return (
                  <div
                    key={tier}
                    className={`flex flex-col rounded-2xl border p-5 ${
                      highlight
                        ? "border-slate-900 ring-1 ring-slate-900"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          {cfg.label}
                        </h2>
                        {highlight && (
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {cfg.tagline}
                      </p>
                    </div>
                    <div className="mb-4">
                      <span className="text-2xl font-extrabold text-slate-900">
                        {priceLabel(tier)}
                      </span>
                      {cfg.priceMonthly !== null && cfg.priceMonthly > 0 && (
                        <span className="text-sm text-slate-500">/month</span>
                      )}
                    </div>
                    <ul className="mb-5 flex-1 space-y-2">
                      {cfg.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm text-slate-600"
                        >
                          <span
                            aria-hidden
                            className="mt-0.5 text-emerald-600"
                          >
                            ✓
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {tier === "free" ? (
                      <Link
                        href="/api-docs"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Get a free key
                      </Link>
                    ) : tier === "enterprise" ? (
                      <a
                        href="mailto:api@invest.com.au"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Contact sales
                      </a>
                    ) : (
                      <a
                        href="#upgrade"
                        className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                          highlight
                            ? "bg-slate-900 text-white hover:bg-slate-800"
                            : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Choose {cfg.label}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Upgrade form */}
          <section id="upgrade" className="mb-12 scroll-mt-20">
            <h2 className="mb-2 text-xl font-bold text-slate-900">
              Upgrade your key
            </h2>
            <p className="mb-4 max-w-2xl text-sm text-slate-600">
              Already have a free key? Enter its prefix and pick a plan — we&apos;ll
              take you to secure Stripe checkout. The new rate limits apply to
              that key as soon as payment completes. You must be{" "}
              <Link
                href="/account/login?redirect=/developers/api/billing"
                className="text-brand underline underline-offset-2"
              >
                signed in
              </Link>{" "}
              with the email the key is registered to.
            </p>
            <UpgradeForm tiers={purchasable} />
          </section>

          {/* Footer help */}
          <section className="mb-8">
            <div className="rounded-xl bg-slate-900 p-6 text-white md:p-8">
              <h2 className="mb-2 text-lg font-bold">
                Questions about the right plan?
              </h2>
              <p className="mb-4 text-sm text-slate-300">
                See the full endpoint reference, or talk to our API team about
                bulk exports, custom limits, and enterprise SLAs.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/api-docs"
                  className="inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                >
                  Read the API docs
                </Link>
                <a
                  href="mailto:api@invest.com.au"
                  className="inline-block rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-slate-400"
                >
                  api@invest.com.au
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
