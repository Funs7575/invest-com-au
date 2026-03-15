"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const PLANS = [
  {
    key: "basic",
    name: "Basic",
    monthlyPrice: 99,
    annualPrice: 990,
    annualSavings: 198,
    features: [
      "10 leads per month",
      "Standard matching",
      "Email notifications",
      "Badge on profile",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    key: "professional",
    name: "Professional",
    monthlyPrice: 249,
    annualPrice: 2490,
    annualSavings: 498,
    features: [
      "30 leads per month",
      "Priority matching",
      "Qualified leads",
      '"Responds Fast" badge',
      "Featured in search results",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    key: "premium",
    name: "Premium",
    monthlyPrice: 499,
    annualPrice: 4990,
    annualSavings: 998,
    features: [
      "Unlimited leads",
      "Exclusive leads",
      "Top placement in directory",
      "Dedicated account manager",
      "Custom profile page",
    ],
    cta: "Get Started",
    popular: false,
  },
] as const;

const FAQS = [
  {
    q: "Can I change plans later?",
    a: "Yes. You can upgrade or downgrade your plan at any time from your advisor dashboard. Changes take effect at the start of your next billing cycle.",
  },
  {
    q: "What counts as a lead?",
    a: "A lead is an investor enquiry submitted through your profile on Invest.com.au — including contact form submissions, booking requests, and phone call clicks.",
  },
  {
    q: "Is there a lock-in contract?",
    a: "No. Monthly plans can be cancelled anytime. Annual plans are billed upfront for the year and include a significant discount.",
  },
  {
    q: "Do I need an AFSL to join?",
    a: "You need to be a registered financial adviser, accountant, or authorised representative under an AFSL. We verify all applicants before publishing profiles.",
  },
  {
    q: "How are leads matched to my profile?",
    a: "Leads are matched based on your specialisations, location, and the investor's needs. Professional and Premium plans receive priority in matching algorithms.",
  },
];

export default function PricingClient() {
  const [annual, setAnnual] = useState(false);
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
          billing_cycle: annual ? "annual" : "monthly",
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
            Advisor Plans
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
            Plans &amp; Pricing
          </h1>
          <p className="text-lg md:text-xl text-violet-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Choose the plan that fits your practice. All plans include a verified
            profile on Invest.com.au and access to your advisor dashboard.
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3">
            <span
              className={`text-sm font-semibold ${!annual ? "text-white" : "text-violet-300"}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                annual ? "bg-emerald-400" : "bg-violet-400"
              }`}
              aria-label="Toggle annual billing"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  annual ? "translate-x-7" : ""
                }`}
              />
            </button>
            <span
              className={`text-sm font-semibold ${annual ? "text-white" : "text-violet-300"}`}
            >
              Annual{" "}
              <span className="text-emerald-300 text-xs font-bold">Save up to $998</span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-12 md:py-20 px-4 -mt-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const price = annual ? plan.annualPrice : plan.monthlyPrice;
            const period = annual ? "/yr" : "/mo";
            const isLoading = loading === plan.key;

            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-2xl shadow-lg p-6 md:p-8 flex flex-col ${
                  plan.popular
                    ? "ring-2 ring-violet-500 shadow-violet-100"
                    : "border border-slate-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-600 text-white text-xs font-bold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-extrabold text-slate-900 mb-1">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-3xl md:text-4xl font-extrabold text-slate-900">
                    ${price.toLocaleString()}
                  </span>
                  <span className="text-slate-500 text-sm">{period}</span>
                  {annual && (
                    <p className="text-emerald-600 text-xs font-semibold mt-1">
                      Save ${plan.annualSavings} per year
                    </p>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <Icon
                        name="check-circle"
                        size={16}
                        className="text-emerald-500 shrink-0 mt-0.5"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelect(plan.key)}
                  disabled={isLoading}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    plan.popular
                      ? "bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-400"
                      : "bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                  }`}
                >
                  {isLoading ? "Redirecting..." : plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 md:py-20 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="bg-white rounded-xl border border-slate-200 p-5 md:p-6"
              >
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
        </p>
        <Link
          href="/advisor-signup"
          className="inline-block px-8 py-4 bg-violet-600 text-white font-bold rounded-xl text-lg hover:bg-violet-700 transition-all shadow-lg"
        >
          Apply Now — Free to Start
        </Link>
      </section>
    </div>
  );
}
