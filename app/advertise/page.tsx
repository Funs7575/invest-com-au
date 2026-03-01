import Link from "next/link";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";

export const metadata: Metadata = {
  title: "Advertise With Us | Invest.com.au",
  description: "Reach thousands of Australian investors actively researching brokers. Promote your brokerage on Invest.com.au with CPC campaigns, featured placements, and sponsorship packages.",
  alternates: { canonical: `${siteUrl}/advertise` },
  openGraph: {
    title: "Advertise With Us | Invest.com.au",
    description: "Reach Australian investors actively choosing a broker. CPC campaigns, featured placements, and sponsorship packages.",
    url: `${siteUrl}/advertise`,
    siteName: "Invest.com.au",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Advertise With Us | Invest.com.au",
    description: "Reach Australian investors actively choosing a broker. CPC campaigns, featured placements, and sponsorship packages.",
  },
};

const PLACEMENTS = [
  {
    name: "Compare Page Featured",
    slug: "compare-top",
    description: "Top position on our highest-traffic page. Your brokerage appears above all others when users compare brokers.",
    type: "Featured",
    reach: "15,000+ monthly visitors",
  },
  {
    name: "Compare Page CPC",
    slug: "compare-cpc",
    description: "Pay per click on the compare page. Only pay when a user clicks through to your site.",
    type: "CPC",
    reach: "15,000+ monthly visitors",
  },
  {
    name: "Quiz Results Boost",
    slug: "quiz-boost",
    description: "Appear as a recommended broker in our personalised quiz results, reaching users with high purchase intent.",
    type: "Featured",
    reach: "5,000+ monthly quiz completions",
  },
  {
    name: "Homepage Featured",
    slug: "homepage-featured",
    description: "Premium visibility on our homepage comparison table, seen by every visitor to invest.com.au.",
    type: "Featured",
    reach: "25,000+ monthly visitors",
  },
  {
    name: "Article Sidebar",
    slug: "articles-sidebar",
    description: "Contextual placement alongside our educational articles and guides.",
    type: "CPC",
    reach: "20,000+ monthly readers",
  },
  {
    name: "Deals Page",
    slug: "deals-featured",
    description: "Highlight your promotional offers on our deals and promotions page.",
    type: "Featured",
    reach: "8,000+ monthly visitors",
  },
];

const TIERS = [
  {
    name: "Featured Partner",
    price: "$1,500",
    period: "/month",
    features: [
      "Top position across all pages",
      "\"Featured Partner\" badge",
      "Priority in quiz results",
      "Dedicated account manager",
      "Monthly performance reports",
    ],
    highlight: true,
  },
  {
    name: "Editor's Pick",
    price: "$800",
    period: "/month",
    features: [
      "Promoted position in listings",
      "\"Editor's Pick\" badge",
      "Enhanced broker profile",
      "Quarterly performance reports",
    ],
    highlight: false,
  },
  {
    name: "Deal of the Month",
    price: "$2,000",
    period: "/month",
    features: [
      "Featured deal banner sitewide",
      "\"Deal of the Month\" badge",
      "Homepage deal carousel",
      "Email newsletter inclusion",
      "Social media promotion",
    ],
    highlight: false,
  },
];

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
            Invest.com.au is Australia&apos;s leading broker comparison platform. Our users are high-intent — they&apos;re actively researching and ready to open accounts.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/broker-portal/register"
              className="px-8 py-3 bg-amber-500 text-slate-900 font-bold text-sm rounded-lg hover:bg-amber-400 transition-colors">
              Start Advertising →
            </Link>
            <a href="mailto:partners@invest.com.au"
              className="px-8 py-3 bg-white/10 text-white font-bold text-sm rounded-lg hover:bg-white/20 transition-colors">
              Contact Sales
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Already a partner?{" "}
            <Link href="/broker-portal/login" className="text-white underline hover:text-amber-300 transition-colors">
              Sign in to your dashboard →
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
              { value: "25+", label: "Brokers Compared" },
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
                <p className="text-xs text-slate-400 font-medium">{p.reach}</p>
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
              <div key={tier.name} className={`rounded-xl border p-6 ${
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
                <ul className="space-y-2">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
            <Link href="/broker-portal/register"
              className="px-8 py-3 bg-amber-500 text-slate-900 font-bold text-sm rounded-lg hover:bg-amber-400 transition-colors">
              Create Partner Account →
            </Link>
            <a href="mailto:partners@invest.com.au"
              className="px-8 py-3 bg-white/10 text-white font-bold text-sm rounded-lg hover:bg-white/20 transition-colors">
              partners@invest.com.au
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Existing partner?{" "}
            <Link href="/broker-portal/login" className="text-white underline hover:text-amber-300 transition-colors">
              Sign in →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
