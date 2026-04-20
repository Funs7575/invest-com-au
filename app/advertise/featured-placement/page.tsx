import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import FeaturedPlacementBookingForm from "./FeaturedPlacementBookingForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Sponsored Placement for Australian Brokers — ${SITE_NAME}`,
  description:
    "Book Featured Partner, Editor's Pick, or Deal-of-Month placement on invest.com.au. Transparent pricing, month-to-month, book your own slot with Stripe checkout.",
  alternates: { canonical: "/advertise/featured-placement" },
  openGraph: {
    title: "Sponsored Placement for Australian Brokers — invest.com.au",
    description:
      "Book Featured Partner, Editor's Pick, or Deal-of-Month placement. Transparent pricing, self-serve checkout.",
    url: `${SITE_URL}/advertise/featured-placement`,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

interface PricingRow {
  id: number;
  tier: string;
  duration_days: number;
  amount_cents: number;
  description: string | null;
  max_concurrent: number;
  sort_order: number;
}

interface BrokerRow {
  slug: string;
  name: string;
}

async function loadPricing(): Promise<PricingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sponsored_placement_pricing")
    .select("id, tier, duration_days, amount_cents, description, max_concurrent, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as PricingRow[];
}

async function loadBrokers(): Promise<BrokerRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brokers")
    .select("slug, name")
    .eq("status", "active")
    .order("name", { ascending: true });
  return (data ?? []) as BrokerRow[];
}

function prettyTier(t: string): string {
  return t
    .split("_")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

function groupByTier(rows: PricingRow[]) {
  const m = new Map<string, PricingRow[]>();
  for (const r of rows) {
    const bucket = m.get(r.tier) ?? [];
    bucket.push(r);
    m.set(r.tier, bucket);
  }
  for (const bucket of m.values()) {
    bucket.sort((a, z) => a.duration_days - z.duration_days);
  }
  return m;
}

const TIER_COPY: Record<
  string,
  { eyebrow: string; headline: string; blurb: string; icon: string }
> = {
  featured_partner: {
    eyebrow: "Entry tier",
    headline: "Featured Partner",
    blurb:
      "Your logo + tagline appear on every broker card across the site. Subtle but site-wide reach — the warmup most partners start with.",
    icon: "⭐",
  },
  editors_pick: {
    eyebrow: "Mid tier",
    headline: "Editor's Pick",
    blurb:
      "Pinned to position #1 on the category pages relevant to your platform type. The position that converts best across every test we've run.",
    icon: "🏆",
  },
  deal_of_month: {
    eyebrow: "Premium",
    headline: "Deal of the Month",
    blurb:
      "One broker at a time, homepage banner + every /deals page card gets your offer. Maximum reach — one slot a month only.",
    icon: "🎯",
  },
};

export default async function FeaturedPlacementPage() {
  const [pricing, brokers] = await Promise.all([loadPricing(), loadBrokers()]);
  const grouped = groupByTier(pricing);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Sponsored Placement",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    areaServed: { "@type": "Country", name: "Australia" },
    description:
      "Sponsored placement on invest.com.au for Australian brokers, CFD platforms, super funds, and crypto exchanges.",
    offers: pricing.map((p) => ({
      "@type": "Offer",
      name: `${prettyTier(p.tier)} — ${p.duration_days} days`,
      priceCurrency: "AUD",
      price: (p.amount_cents / 100).toFixed(2),
      url: `${SITE_URL}/advertise/featured-placement`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />

      <div className="bg-slate-50 min-h-screen">
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-12 md:py-16">
          <div className="container-custom max-w-4xl">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-300 mb-2">
              For brokers, super funds, crypto + CFD platforms
            </p>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 leading-tight">
              Sponsored placement on invest.com.au
            </h1>
            <p className="text-base md:text-lg text-slate-300 max-w-2xl mb-6">
              Get your platform in front of Australia&apos;s investing
              audience. Transparent pricing, month-to-month, self-serve
              checkout. No sales calls required.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm transition-colors"
              >
                See pricing
              </a>
              <a
                href="#book"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                Book a slot
              </a>
            </div>
          </div>
        </section>

        <section id="pricing" className="container-custom max-w-5xl py-10 md:py-14">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            Tiers &amp; pricing
          </h2>
          <p className="text-sm md:text-base text-slate-600 mb-8 max-w-2xl">
            All slots are month-to-month. Cancel anytime by not renewing.
            Prices listed are AUD, inclusive of GST.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Array.from(grouped.entries()).map(([tier, rows]) => {
              const copy = TIER_COPY[tier] ?? {
                eyebrow: "",
                headline: prettyTier(tier),
                blurb: "",
                icon: "",
              };
              const lowest = rows[0]!;
              return (
                <article
                  key={tier}
                  className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col"
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-600 mb-1">
                    {copy.eyebrow}
                  </p>
                  <h3 className="text-xl font-extrabold text-slate-900 mb-1">
                    <span className="mr-1.5" aria-hidden="true">{copy.icon}</span>
                    {copy.headline}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">
                    {copy.blurb}
                  </p>
                  <div className="space-y-2 mb-5">
                    {rows.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-baseline justify-between border-b border-slate-100 py-2"
                      >
                        <span className="text-sm font-semibold text-slate-700">
                          {r.duration_days} days
                        </span>
                        <span className="text-lg font-extrabold text-slate-900 tabular-nums">
                          A$
                          {(r.amount_cents / 100).toLocaleString("en-AU", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-auto">
                    {lowest.max_concurrent === 1
                      ? "Exclusive — 1 partner at a time."
                      : `Up to ${lowest.max_concurrent} partners concurrently.`}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="book" className="container-custom max-w-3xl pb-14">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1">
              Book a slot
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Pick your tier, duration, start date, and broker. Checkout is
              Stripe-hosted — you&apos;ll receive an invoice + campaign
              dashboard access as soon as payment clears.
            </p>
            <Suspense fallback={<p className="text-sm text-slate-500">Loading booking form…</p>}>
              <FeaturedPlacementBookingForm pricing={pricing} brokers={brokers} />
            </Suspense>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6 max-w-xl mx-auto leading-relaxed">
            All sponsored placements are visually labelled as such on the
            site. Editorial rankings are not affected by sponsorship —
            see our{" "}
            <Link href="/methodology" className="text-amber-700 underline">
              methodology
            </Link>{" "}
            for how we rank platforms independently.
          </p>
        </section>

        <section className="container-custom max-w-4xl pb-16">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            Frequently asked
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "Does sponsored placement influence editorial ranking?",
                a: "No. Our comparison pages and 'best for' rankings are determined by factual data (fees, features, CHESS sponsorship, SMSF support, etc.) applied uniformly. Sponsored placement is visually labelled and sits in its own slots. See /methodology for full detail.",
              },
              {
                q: "What happens at the end of my placement window?",
                a: "Your placement automatically ends. We'll email you 7 days before expiry so you can book a renewal if you want continuity. No auto-renewal by default.",
              },
              {
                q: "Can I pick specific start dates?",
                a: "Yes — you choose your start date at checkout (within the next 6 months). If your chosen window is full for that tier, we'll show availability and suggest alternatives.",
              },
              {
                q: "Will I see performance data?",
                a: "Yes. Log in to your Broker Portal at /broker-portal/sponsored-slots after checkout. You'll see impression counts, affiliate clicks, and campaign-window CTR updated daily.",
              },
              {
                q: "Do you invoice?",
                a: "Yes — Stripe issues an invoice automatically at checkout with GST. You can download the PDF or send it straight to your accounts team from the receipt email.",
              },
            ].map((f) => (
              <details
                key={f.q}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <summary className="text-sm font-bold text-slate-900 cursor-pointer">
                  {f.q}
                </summary>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
