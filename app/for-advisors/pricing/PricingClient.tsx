"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const TIERS = [
  {
    key: "bronze",
    name: "Bronze",
    badge: "Free to start",
    monthlyFee: 0,
    leadFee: 100,
    matchMultiplier: "1×",
    color: "border-amber-700",
    badgeColor: "bg-amber-100 text-amber-800",
    popular: false,
    features: [
      "Verified directory listing",
      "Public profile page",
      "Organic lead matching",
      "$100 per lead received",
      "Email notifications",
    ],
    cta: "Create Free Profile",
    ctaHref: "/advisor-signup",
  },
  {
    key: "silver",
    name: "Silver",
    badge: "Most Popular",
    monthlyFee: 200,
    leadFee: 80,
    matchMultiplier: "2×",
    color: "ring-2 ring-violet-500",
    badgeColor: "bg-violet-600 text-white",
    popular: true,
    features: [
      "Everything in Bronze",
      '"Featured Advisor" badge',
      "Priority search placement",
      "2× lead match rate",
      "$80 per lead (20% saving)",
      "Respond Fast badge",
    ],
    cta: "Get Started",
    ctaHref: null,
  },
  {
    key: "gold",
    name: "Gold",
    badge: "Maximum exposure",
    monthlyFee: 500,
    leadFee: 60,
    matchMultiplier: "4×",
    color: "border-yellow-400",
    badgeColor: "bg-yellow-400 text-slate-900",
    popular: false,
    features: [
      "Everything in Silver",
      "Homepage spotlight rotation",
      "Article bylines & author profile",
      "Quarterly email blast to subscribers",
      "4× lead match rate",
      "$60 per lead (40% saving)",
      "Dedicated account manager",
    ],
    cta: "Get Started",
    ctaHref: null,
  },
] as const;

const FAQS = [
  {
    q: "How does pay-per-lead pricing work?",
    a: "You're only charged when you receive a qualified lead — someone who has completed our matching quiz and expressed intent to speak with an advisor. There's no charge for unmatched leads.",
  },
  {
    q: "Can I change tiers later?",
    a: "Yes. You can upgrade or downgrade your tier at any time from your advisor dashboard. Changes take effect at the start of your next billing cycle.",
  },
  {
    q: "What counts as a lead?",
    a: "A lead is a verified investor enquiry matched to your profile — including contact form submissions, booking requests, and phone call clicks from your profile page.",
  },
  {
    q: "Is there a lock-in contract?",
    a: "No. Monthly plans can be cancelled anytime. The Bronze tier is free with no commitment required.",
  },
  {
    q: "Do I need an AFSL to join?",
    a: "Yes — you must be a registered financial adviser, accountant, or authorised representative under an AFSL. We verify all applicants before publishing profiles.",
  },
  {
    q: "How are leads matched to my profile?",
    a: "Leads are matched based on your specialisations, location, and the investor's needs. Silver and Gold tiers receive 2× and 4× the standard match rate respectively.",
  },
];

export default function PricingClient() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSelect(planKey: string) {
    setLoading(planKey);
    try {
      const res = await fetch("/api/stripe/create-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisor_id: "self",
          plan: planKey,
          billing_cycle: "monthly",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong. Please try again.");
        setLoading(null);
      }
    } catch {
      alert("Network error. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 text-white py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-violet-200 text-sm font-semibold mb-3 uppercase tracking-wider">
            Advisor Tiers
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
            Plans &amp; Pricing
          </h1>
          <p className="text-lg md:text-xl text-violet-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Pay only for leads you receive. Choose your tier to unlock priority matching, featured placement, and lower per-lead costs.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm font-medium">
            <Icon name="shield-check" size={14} className="text-emerald-300" />
            Free to start — no credit card required for Bronze
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-12 md:py-20 px-4 -mt-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const isLoading = loading === tier.key;

            return (
              <div
                key={tier.key}
                className={`relative bg-white rounded-2xl shadow-lg p-6 md:p-8 flex flex-col ${tier.color} border`}
              >
                {/* Badge */}
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold rounded-full ${tier.badgeColor}`}>
                  {tier.badge}
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 mb-1 mt-2">
                  {tier.name}
                </h3>

                {/* Pricing */}
                <div className="mb-2">
                  <span className="text-3xl md:text-4xl font-extrabold text-slate-900">
                    ${tier.monthlyFee.toLocaleString()}
                  </span>
                  <span className="text-slate-500 text-sm">/mo</span>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  + <span className="font-bold text-slate-900">${tier.leadFee}</span> per lead &nbsp;·&nbsp; <span className="font-bold text-violet-600">{tier.matchMultiplier} match rate</span>
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <Icon name="check-circle" size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {tier.ctaHref ? (
                  <Link
                    href={tier.ctaHref}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all text-center bg-slate-100 text-slate-900 hover:bg-slate-200 block"
                  >
                    {tier.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleSelect(tier.key)}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                      tier.popular
                        ? "bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-400"
                        : "bg-amber-400 text-slate-900 hover:bg-amber-500 disabled:bg-amber-200"
                    }`}
                  >
                    {isLoading ? "Redirecting..." : tier.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Comparison note */}
        <p className="text-center text-sm text-slate-500 mt-8 max-w-xl mx-auto">
          All tiers include ASIC verification, a public profile, and access to your advisor dashboard.
          Lead fees are charged monthly in arrears — only for leads you accept.
        </p>
      </section>

      {/* FAQs */}
      <section className="py-12 md:py-20 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q} className="bg-white rounded-xl border border-slate-200 p-5 md:p-6">
                <h3 className="font-bold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16 px-4 text-center">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-3">
          Ready to grow your practice?
        </h2>
        <p className="text-slate-600 mb-6 max-w-lg mx-auto">
          Join hundreds of Australian advisors who use Invest.com.au to reach new clients.
          Start free on Bronze — upgrade anytime.
        </p>
        <Link
          href="/advisor-signup"
          className="inline-block px-8 py-4 bg-violet-600 text-white font-bold rounded-xl text-lg hover:bg-violet-700 transition-all shadow-lg"
        >
          Create Free Profile &rarr;
        </Link>
      </section>
    </div>
  );
}
