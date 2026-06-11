import Link from "next/link";
import type { Metadata } from "next";
import { SELF_SERVE_TIERS } from "@/lib/sponsorship-tiers";

export const revalidate = 86400;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";

export const metadata: Metadata = {
  title: "Advertise With Us",
  description: "Reach Australian investors actively comparing brokers. CPC campaigns, featured placements, and sponsorship packages on Invest.com.au.",
  alternates: { canonical: `${siteUrl}/advertise` },
  openGraph: {
    title: "Advertise With Us",
    description: "Reach Australian investors actively choosing a broker. CPC campaigns, featured placements, and sponsorship packages.",
    url: `${siteUrl}/advertise`,
    siteName: "Invest.com.au",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Advertise With Us",
    description: "Reach Australian investors actively choosing a broker. CPC campaigns, featured placements, and sponsorship packages.",
  },
  robots: { index: false, follow: false },
};

const PLACEMENTS = [
  {
    name: "Compare Page Featured",
    slug: "compare-top",
    description: "Top position on our highest-traffic page. Your brokerage appears above all others when users compare brokers.",
    type: "Featured",
    reach: "15,000+ monthly visitors",
    bestFor: "Established brokers building brand dominance",
    ctrRange: "Avg CTR: 1.8–2.4%",
  },
  {
    name: "Compare Page CPC",
    slug: "compare-cpc",
    description: "Pay per click on the compare page. Only pay when a user clicks through to your site.",
    type: "CPC",
    reach: "15,000+ monthly visitors",
    bestFor: "Performance-focused campaigns with set CPA targets",
    ctrRange: "Avg CTR: 0.8–1.2%",
  },
  {
    name: "Quiz Results Boost",
    slug: "quiz-boost",
    description: "Appear as a recommended platform in our personalised quiz results, reaching users with high purchase intent.",
    type: "Featured",
    reach: "5,000+ monthly quiz completions",
    bestFor: "Brokers targeting first-time or beginner investors",
    ctrRange: "Avg CTR: 2.5–3.5%",
  },
  {
    name: "Homepage Featured",
    slug: "homepage-featured",
    description: "Premium visibility on our homepage comparison table, seen by every visitor to invest.com.au.",
    type: "Featured",
    reach: "25,000+ monthly visitors",
    bestFor: "Top-of-funnel awareness across all investor segments",
    ctrRange: "Avg CTR: 1.2–1.8%",
  },
  {
    name: "Article Sidebar",
    slug: "articles-sidebar",
    description: "Contextual placement alongside our educational articles and guides.",
    type: "CPC",
    reach: "20,000+ monthly readers",
    bestFor: "Brokers targeting research-phase investors reading guides",
    ctrRange: "Avg CTR: 0.4–0.7%",
  },
  {
    name: "Deals Page",
    slug: "deals-featured",
    description: "Highlight your promotional offers on our deals and promotions page.",
    type: "Featured",
    reach: "8,000+ monthly visitors",
    bestFor: "Time-limited promotions and sign-up bonus campaigns",
    ctrRange: "Avg CTR: 1.5–2.2%",
  },
];

/**
 * Tier copy mirrors the self-serve catalogue so prices on the marketing
 * page never drift from what `/advertise/packages` actually charges.
 * Edit prices/features in `lib/sponsorship-tiers.ts`, not here.
 */

/** ADV-123: Small-print keyed by tier id — billing terms, minimums, rate info. */
const TIER_SMALL_PRINT: Record<string, { minimum: string; billing: string; rateNote: string }> = {
  featured_partner: {
    minimum: "$2,000/month minimum",
    billing: "1-month minimum · up to 30% off on 12-month plans",
    rateNote: "Includes CPC credits · rates from $1.20–$2.50/click",
  },
  category_sponsor: {
    minimum: "$500/month minimum",
    billing: "Billed monthly · cancel anytime",
    rateNote: "Fixed sponsorship fee · no per-click charges",
  },
  deal_of_month: {
    minimum: "$300/month minimum",
    billing: "Billed monthly · cancel anytime",
    rateNote: "Flat fee per promotion cycle · no per-click charges",
  },
};

const TIERS = SELF_SERVE_TIERS.map((t) => ({
  name: t.name,
  id: t.id,
  price: `$${t.basePrice.toLocaleString("en-AU")}`,
  period: "/month",
  features: t.includes,
  highlight: !!t.highlight,
  smallPrint: TIER_SMALL_PRINT[t.id],
}));

export default function AdvertisePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-slate-900 text-white py-16 md:py-24">
        <div className="container-custom text-center">
          <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full mb-4 uppercase tracking-widest">
            Partner with us
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 max-w-3xl mx-auto leading-tight">
            Reach Australian investors actively choosing a broker
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto mb-8">
            Invest.com.au is Australia&apos;s leading independent investing comparison hub. Our users are high-intent &mdash; they&apos;re actively researching and ready to open accounts.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/advertise/packages"
              className="px-8 py-3 bg-amber-500 text-slate-900 font-bold text-sm rounded-lg hover:bg-amber-400 transition-colors">
              Start Advertising &rarr;
            </Link>
            <a href="mailto:partners@invest.com.au"
              className="px-8 py-3 bg-white/10 text-white font-bold text-sm rounded-lg hover:bg-white/20 transition-colors">
              Contact Sales
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Already a partner?{" "}
            <Link href="/broker-portal/login" className="text-white underline hover:text-amber-300 transition-colors">
              Sign in to your dashboard &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "50,000+", label: "Monthly Visitors" },
              { value: "25+", label: "Platforms Compared" },
              { value: "10,000+", label: "Monthly Quiz Completions" },
              { value: "85%", label: "Mobile Traffic" },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Available Placements */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">Available Placements</h2>
            <p className="text-sm text-slate-500 mt-2">Choose where your brokerage appears across our platform</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PLACEMENTS.map(p => (
              <div key={p.slug} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    p.type === "CPC" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                  }`}>
                    {p.type}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-3">{p.description}</p>
                <p className="text-xs text-slate-500 font-medium mb-3">{p.reach}</p>
                {/* ADV-124: Best-for guidance + estimated CTR */}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Best for: {p.bestFor}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    {p.ctrRange}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsorship Tiers */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">Sponsorship Packages</h2>
            <p className="text-sm text-slate-500 mt-2">Premium visibility with guaranteed placement and badging</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {TIERS.map(tier => (
              <div key={tier.name} className={`rounded-xl border p-6 flex flex-col ${
                tier.highlight ? "border-amber-300 bg-amber-50/30 ring-1 ring-amber-300" : "border-slate-200 bg-white"
              }`}>
                {tier.highlight && (
                  <span className="text-[0.65rem] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-extrabold text-slate-900 mt-2">{tier.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-extrabold text-slate-900">{tier.price}</span>
                  <span className="text-sm text-slate-500">{tier.period}</span>
                </div>
                <ul className="space-y-2 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {/* ADV-123: Pricing small-print */}
                {tier.smallPrint && (
                  <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-1">
                    <p className="text-[0.7rem] text-slate-500 font-medium">{tier.smallPrint.minimum}</p>
                    <p className="text-[0.7rem] text-slate-500">{tier.smallPrint.billing}</p>
                    <p className="text-[0.7rem] text-slate-500">{tier.smallPrint.rateNote}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/advertise/packages"
              className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors"
            >
              Configure &amp; book a package
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <p className="text-xs text-slate-500 mt-3">
              Self-serve checkout with duration discounts &mdash; or{" "}
              <a href="mailto:partners@invest.com.au" className="underline hover:text-slate-900 transition-colors">
                contact sales
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Register", desc: "Create your partner account in minutes" },
              { step: "2", title: "Fund Wallet", desc: "Add funds via Stripe — minimum $50 AUD" },
              { step: "3", title: "Create Campaign", desc: "Choose placements, set your budget and CPC rate" },
              { step: "4", title: "Track Results", desc: "Monitor clicks, conversions and ROI in real time" },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                  {s.step}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{s.title}</h3>
                <p className="text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16 bg-slate-900 text-white text-center">
        <div className="container-custom">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Ready to grow your customer base?</h2>
          <p className="text-slate-300 mb-6 max-w-lg mx-auto">
            Join leading Australian brokerages already advertising on Invest.com.au.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/advertise/packages"
              className="px-8 py-3 bg-amber-500 text-slate-900 font-bold text-sm rounded-lg hover:bg-amber-400 transition-colors">
              Create Partner Account &rarr;
            </Link>
            <a href="mailto:partners@invest.com.au"
              className="px-8 py-3 bg-white/10 text-white font-bold text-sm rounded-lg hover:bg-white/20 transition-colors">
              partners@invest.com.au
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Existing partner?{" "}
            <Link href="/broker-portal/login" className="text-white underline hover:text-amber-300 transition-colors">
              Sign in &rarr;
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
