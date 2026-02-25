"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSubscription } from "@/lib/hooks/useSubscription";

const features = [
  {
    name: "Broker comparison table",
    free: true,
    pro: true,
    description: "Compare fees, features, and ratings across all Australian brokers",
  },
  {
    name: "User reviews & ratings",
    free: true,
    pro: true,
    description: "Read real reviews from Australian investors",
  },
  {
    name: "Articles & guides",
    free: true,
    pro: true,
    description: "In-depth investing guides and market analysis",
  },
  {
    name: "Broker quiz",
    free: true,
    pro: true,
    description: "Find your perfect broker match in 60 seconds",
  },
  {
    name: "Personal fee impact calculator",
    free: false,
    pro: true,
    description: "See your total annual broker fees across every broker — free users see top 3 only",
  },
  {
    name: "Fee alert notifications",
    free: false,
    pro: true,
    description: "Get emailed when broker fees change so you never overpay",
  },
  {
    name: "Advanced comparison tools",
    free: false,
    pro: true,
    description: "Side-by-side deep dives, custom filters, and export tools",
  },
  {
    name: "Monthly market brief",
    free: false,
    pro: true,
    description: "Curated monthly email with market insights and fee trends",
  },
  {
    name: "Expert-led investing courses",
    free: false,
    pro: true,
    description: "Access premium investing courses from Australian market professionals",
  },
  {
    name: "Fee benchmarking radar chart",
    free: false,
    pro: true,
    description: "Full dimension breakdown with comparison mode across all 6 fee dimensions",
  },
  {
    name: "Broker health & risk scores",
    free: false,
    pro: true,
    description: "Full safety breakdown with 5 dimensions, AFSL verification, and detailed notes",
  },
  {
    name: "Regulatory & tax change alerts",
    free: false,
    pro: true,
    description: "Curated ASIC/ATO/Treasury changes with detailed action items",
  },
  {
    name: "Quarterly industry reports",
    free: false,
    pro: true,
    description: "In-depth quarterly analysis with fee changes, new entrants, and market trends",
  },
  {
    name: "Exclusive Pro deals",
    free: false,
    pro: true,
    description: "Special broker sign-up bonuses and reduced fees only for Pro members",
  },
  {
    name: "PDF & CSV exports",
    free: false,
    pro: true,
    description: "Export broker comparisons and fee impact reports as branded PDFs or CSV files",
  },
  {
    name: "Ad-free experience",
    free: false,
    pro: true,
    description: "Browse without promotional popups or lead capture forms",
  },
  {
    name: "Priority support",
    free: false,
    pro: true,
    description: "Get fast, personalised responses to your investing questions",
  },
];

const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel with one click from your account page. You keep access until your billing period ends — no questions asked.",
  },
  {
    q: "Is there a free trial?",
    a: "Not currently, but all existing features remain completely free. Pro just adds extra tools and a better experience on top.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, Amex) through Stripe, our secure payment processor.",
  },
  {
    q: "Can I switch between monthly and yearly?",
    a: "Yes. You can switch plans anytime from your account page. If you upgrade to yearly, you'll be credited for the remaining time on your monthly plan.",
  },
  {
    q: "Do you offer refunds?",
    a: "If you're not happy within the first 7 days, contact us for a full refund.",
  },
];

export default function ProPageClient() {
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const { user, isPro, loading: authLoading } = useSubscription();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("checkout") === "cancelled";

  const handleSubscribe = async () => {
    if (!user) {
      router.push("/auth/login?next=/pro");
      return;
    }

    if (isPro) {
      router.push("/account");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-4xl">
        {/* Cancelled banner */}
        {cancelled && (
          <div className="mb-3 md:mb-6 bg-amber-50 border border-amber-200 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 text-[0.69rem] md:text-sm text-amber-800">
            Checkout was cancelled. No charge was made. You can try again anytime.
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-5 md:mb-12">
          <div className="inline-flex items-center gap-1 md:gap-1.5 px-2.5 py-0.5 md:px-3 md:py-1 bg-amber-100 text-amber-700 text-[0.62rem] md:text-xs font-bold rounded-full mb-2 md:mb-4">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            INVESTOR PRO
          </div>
          <h1 className="text-lg md:text-4xl font-extrabold text-slate-900 mb-1 md:mb-3">
            Smarter investing starts here
          </h1>
          <p className="text-[0.69rem] md:text-lg text-slate-600 max-w-2xl mx-auto">
            Fee alerts, advanced comparison tools, market briefs, and an ad-free experience.
          </p>
        </div>

        {/* Pricing Toggle */}
        <div className="flex justify-center mb-4 md:mb-8">
          <div className="inline-flex items-center bg-slate-100 rounded-full p-0.5 md:p-1">
            <button
              onClick={() => setPlan("monthly")}
              className={`px-4 py-1.5 md:px-5 md:py-2 text-xs md:text-sm font-semibold rounded-full transition-all ${
                plan === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPlan("yearly")}
              className={`px-4 py-1.5 md:px-5 md:py-2 text-xs md:text-sm font-semibold rounded-full transition-all ${
                plan === "yearly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Yearly
              <span className="ml-1 md:ml-1.5 text-[0.62rem] md:text-xs text-green-600 font-bold">Save 18%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards — Pro first on mobile for conversion */}
        <div className="grid md:grid-cols-2 gap-3 md:gap-6 mb-8 md:mb-16">
          {/* Pro — shown first on mobile via order */}
          <div className="bg-white border-2 border-slate-700 rounded-xl md:rounded-2xl p-4 md:p-6 relative order-first md:order-last">
            <div className="absolute -top-2.5 md:-top-3 left-4 md:left-6 px-2.5 py-0.5 bg-slate-700 text-white text-[0.56rem] md:text-xs font-bold rounded-full">
              RECOMMENDED
            </div>
            <h3 className="text-sm md:text-lg font-bold text-slate-900 mb-0.5 md:mb-1">Investor Pro</h3>
            <p className="text-[0.69rem] md:text-sm text-slate-500 mb-2 md:mb-4">Premium tools for smarter investing</p>
            <div className="flex items-baseline gap-1 mb-0.5 md:mb-1">
              <span className="text-2xl md:text-4xl font-extrabold text-slate-900">
                ${plan === "yearly" ? "89" : "9"}
              </span>
              <span className="text-slate-400 text-[0.69rem] md:text-sm">/{plan === "yearly" ? "year" : "month"}</span>
            </div>
            {plan === "yearly" && (
              <p className="text-[0.62rem] md:text-xs text-green-600 font-medium mb-3 md:mb-5">
                That&apos;s just $7.42/month — save $19 vs monthly
              </p>
            )}
            {plan === "monthly" && <div className="mb-3 md:mb-5" />}

            <button
              onClick={handleSubscribe}
              disabled={loading || authLoading}
              className="block w-full text-center px-4 py-2 md:py-2.5 bg-slate-900 text-white text-xs md:text-sm font-semibold rounded-lg md:rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {authLoading
                ? "Loading..."
                : loading
                ? "Redirecting to checkout..."
                : isPro
                ? "Manage Subscription"
                : user
                ? "Subscribe Now"
                : "Sign In & Subscribe"}
            </button>
            <ul className="mt-4 md:mt-6 space-y-2 md:space-y-3">
              {features.map((f) => (
                <li key={f.name} className="flex items-start gap-1.5 md:gap-2">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <span className={`text-[0.69rem] md:text-sm ${!f.free ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                      {f.name}
                    </span>
                    {!f.free && (
                      <p className="hidden md:block text-xs text-slate-500 mt-0.5">{f.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Free */}
          <div className="bg-white border border-slate-200 rounded-xl md:rounded-2xl p-4 md:p-6 order-last md:order-first">
            <h3 className="text-sm md:text-lg font-bold text-slate-900 mb-0.5 md:mb-1">Free</h3>
            <p className="text-[0.69rem] md:text-sm text-slate-500 mb-2 md:mb-4">Everything you need to get started</p>
            <div className="flex items-baseline gap-1 mb-3 md:mb-6">
              <span className="text-2xl md:text-4xl font-extrabold text-slate-900">$0</span>
              <span className="text-slate-400 text-[0.69rem] md:text-sm">/forever</span>
            </div>
            <Link
              href="/compare"
              className="block w-full text-center px-4 py-2 md:py-2.5 border border-slate-200 text-slate-700 text-xs md:text-sm font-semibold rounded-lg md:rounded-xl hover:bg-slate-50 transition-colors"
            >
              Get Started Free
            </Link>
            <ul className="mt-4 md:mt-6 space-y-2 md:space-y-3">
              {features.filter((f) => f.free).map((f) => (
                <li key={f.name} className="flex items-start gap-1.5 md:gap-2">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[0.69rem] md:text-sm text-slate-700">{f.name}</span>
                </li>
              ))}
              {features.filter((f) => !f.free).map((f) => (
                <li key={f.name} className="flex items-start gap-1.5 md:gap-2 opacity-40">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-[0.69rem] md:text-sm text-slate-500">{f.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-8 md:mb-16 text-[0.69rem] md:text-sm text-slate-500">
          <div className="flex items-center gap-1.5 md:gap-2">
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Secure via Stripe
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cancel anytime
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            7-day refund
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-base md:text-2xl font-extrabold text-slate-900 text-center mb-3 md:mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-1.5 md:space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg md:rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-3 py-2.5 md:px-5 md:py-4 text-left gap-2"
                >
                  <span className="text-[0.69rem] md:text-sm font-semibold text-slate-900">{faq.q}</span>
                  <svg
                    className={`w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 shrink-0 transition-transform ${
                      expandedFaq === i ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedFaq === i && (
                  <div className="px-3 pb-2.5 md:px-5 md:pb-4">
                    <p className="text-[0.69rem] md:text-sm text-slate-600">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
