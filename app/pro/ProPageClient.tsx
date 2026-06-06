"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSubscription } from "@/lib/hooks/useSubscription";

const features = [
  {
    name: "Platform comparison table",
    free: true,
    pro: true,
    description: "Compare fees, features, and ratings across all Australian platforms",
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
    name: "Platform quiz",
    free: true,
    pro: true,
    description: "Find your perfect platform match in 60 seconds",
  },
  {
    name: "Personal fee impact calculator",
    free: false,
    pro: true,
    description: "See your total annual platform fees across every platform — free users see top 3 only",
  },
  {
    name: "Fee alert notifications",
    free: false,
    pro: true,
    description: "Get emailed when platform fees change so you never overpay",
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
    name: "Platform health & risk scores",
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
    description: "Special platform sign-up bonuses and reduced fees only for Pro members",
  },
  {
    name: "PDF & CSV exports",
    free: false,
    pro: true,
    description: "Export platform comparisons and fee impact reports as branded PDFs or CSV files",
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
    a: "If you're not happy within the first 7 days, you can request a full refund directly from your account page — no need to contact us.",
  },
];

export default function ProPageClient() {
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
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
    setCheckoutError(null);
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
        setCheckoutError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // Pro member hub links shown only when the user already holds an active Pro subscription.
  const PRO_HUB_LINKS = [
    {
      href: "/pro/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      title: "My Dashboard",
      description: "Portfolio, net worth, alerts, watchlist, and deals — your personal overview",
      badge: "NEW",
    },
    {
      href: "/pro/insights",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Insights Dashboard",
      description: "Full fee comparison, health-score movers, loan rate movements",
      badge: null,
    },
    {
      href: "/pro/research",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "Premium Research",
      description: "Deep-dive reports — fee audits, super deconstructions, sector outlooks",
      badge: null,
    },
    {
      href: "/pro/deals",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      title: "Exclusive Deals",
      description: "Special sign-up bonuses and reduced fees from partner brokers",
      badge: null,
    },
  ];

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-4xl">
        {/* Cancelled banner */}
        {cancelled && (
          <div className="mb-3 md:mb-6 bg-amber-50 border border-amber-200 rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 text-[0.69rem] md:text-sm text-amber-800">
            Checkout was cancelled. No charge was made. You can try again anytime.
          </div>
        )}

        {/* Pro Member Hub — shown instead of the pricing section for active subscribers */}
        {!authLoading && isPro && (
          <div className="mb-6 md:mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                PRO MEMBER HUB
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PRO_HUB_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex flex-col gap-2 bg-white border border-slate-200 hover:border-violet-300 hover:shadow-sm rounded-xl p-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
                      {link.icon}
                    </div>
                    {link.badge && (
                      <span className="text-[0.6rem] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full shrink-0">
                        {link.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">
                      {link.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {link.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
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
              <span className="ml-1 md:ml-1.5 text-[0.62rem] md:text-xs text-emerald-600 font-bold">Save 18%</span>
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
              <p className="text-[0.62rem] md:text-xs text-emerald-600 font-medium mb-3 md:mb-5">
                That&apos;s just $7.42/month — save $19 vs monthly
              </p>
            )}
            {plan === "monthly" && <div className="mb-3 md:mb-5" />}

            <button
              onClick={handleSubscribe}
              disabled={loading || authLoading}
              className="block w-full text-center px-4 py-2 md:py-2.5 bg-slate-900 text-white text-xs md:text-sm font-semibold rounded-lg md:rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            {checkoutError && (
              <p className="mt-2 text-xs text-red-500 text-center">{checkoutError}</p>
            )}
            <ul className="mt-4 md:mt-6 space-y-2 md:space-y-3">
              {features.map((f) => (
                <li key={f.name} className="flex items-start gap-1.5 md:gap-2">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Secure via Stripe
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cancel anytime
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
