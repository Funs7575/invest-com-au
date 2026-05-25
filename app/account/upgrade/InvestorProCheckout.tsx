"use client";

/**
 * InvestorProCheckout — interactive checkout tile for Investor Pro.
 *
 * Client component so that plan-toggle + checkout fetch can react to
 * user input. Mirrors the checkout pattern in ProPageClient.tsx:
 * POST /api/stripe/create-checkout with { plan } then redirect to the
 * returned Stripe session URL.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/lib/hooks/useSubscription";

const PRO_BENEFITS = [
  { label: "Unlimited holdings tracker", desc: "Track every position without a cap" },
  { label: "Sharesight sync", desc: "Import trades directly from Sharesight" },
  { label: "Premium research & market briefs", desc: "Monthly curated insights for AU investors" },
  { label: "Fee alerts", desc: "Get notified the moment platform fees change" },
  { label: "Full fee impact calculator", desc: "Compare all brokers, not just the top 3" },
  { label: "Advanced comparison tools & exports", desc: "CSV/PDF exports and deep-dive filters" },
  { label: "Ad-free experience", desc: "No popups or lead-capture forms" },
  { label: "Priority support", desc: "Fast, personalised responses to your questions" },
];

export default function InvestorProCheckout() {
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isPro, loading: authLoading } = useSubscription();
  const router = useRouter();

  const handleCheckout = async () => {
    if (!user) {
      router.push("/auth/login?next=/account/upgrade");
      return;
    }

    if (isPro) {
      router.push("/account");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (isPro) {
    // Already subscribed — render a dimmed "active" tile consistent with
    // how the workspace tiles render already-held workspaces.
    return (
      <section
        aria-labelledby="investor-pro-heading"
        className="border border-emerald-200 bg-emerald-50 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl" aria-hidden>
            ⭐
          </span>
          <div>
            <h2 id="investor-pro-heading" className="text-base font-bold text-slate-900">
              Investor Pro
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-800">
              Active
            </span>
          </div>
        </div>
        <p className="text-sm text-emerald-800">
          Your Pro subscription is active. Manage billing and subscription details from your account.
        </p>
        <a
          href="/account"
          className="inline-flex items-center justify-center mt-4 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-sm font-semibold px-4 py-2 transition-colors"
        >
          Go to account →
        </a>
      </section>
    );
  }

  const monthlyPrice = 9;
  const yearlyPrice = 89;
  const monthlyEquivalent = "7.42";

  return (
    <section
      aria-labelledby="investor-pro-heading"
      className="border-2 border-amber-400 bg-amber-50 rounded-2xl p-5 md:p-6 relative"
    >
      {/* Badge */}
      <div className="absolute -top-3 left-5 px-2.5 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        INVESTOR PRO
      </div>

      <div className="flex items-start gap-3 mt-2 mb-4">
        <span className="text-3xl" aria-hidden>
          ⭐
        </span>
        <div className="flex-1 min-w-0">
          <h2 id="investor-pro-heading" className="text-base font-bold text-slate-900">
            Investor Pro
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Premium tools for smarter investing — cancel anytime.
          </p>
        </div>
      </div>

      {/* Plan toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPlan("monthly")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
            plan === "monthly"
              ? "bg-amber-500 border-amber-500 text-white"
              : "bg-white border-amber-200 text-slate-700 hover:border-amber-400"
          }`}
        >
          Monthly&nbsp;
          <span className="font-normal opacity-80">${monthlyPrice}/mo</span>
        </button>
        <button
          onClick={() => setPlan("yearly")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
            plan === "yearly"
              ? "bg-amber-500 border-amber-500 text-white"
              : "bg-white border-amber-200 text-slate-700 hover:border-amber-400"
          }`}
        >
          Yearly&nbsp;
          <span className="font-normal opacity-80">${yearlyPrice}/yr</span>
          {plan === "yearly" && (
            <span className="ml-1 text-emerald-900 font-bold">Save 18%</span>
          )}
          {plan !== "yearly" && (
            <span className="ml-1 text-emerald-700 font-bold opacity-100">Save 18%</span>
          )}
        </button>
      </div>

      {/* Price display */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-slate-900">
            ${plan === "yearly" ? yearlyPrice : monthlyPrice}
          </span>
          <span className="text-sm text-slate-500">
            /{plan === "yearly" ? "year" : "month"}
          </span>
        </div>
        {plan === "yearly" && (
          <p className="text-xs text-emerald-700 font-medium mt-0.5">
            That&apos;s just ${monthlyEquivalent}/month — save $19 vs monthly
          </p>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={handleCheckout}
        disabled={loading || authLoading}
        className="block w-full text-center px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
      >
        {authLoading
          ? "Loading..."
          : loading
            ? "Redirecting to checkout..."
            : user
              ? "Subscribe Now"
              : "Sign In & Subscribe"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600 text-center" role="alert">
          {error}
        </p>
      )}

      {/* Benefits list */}
      <ul className="mt-5 space-y-2.5">
        {PRO_BENEFITS.map((b) => (
          <li key={b.label} className="flex items-start gap-2">
            <svg
              className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <span className="text-sm font-semibold text-slate-900">{b.label}</span>
              <p className="text-xs text-slate-500">{b.desc}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Trust signals */}
      <div className="mt-5 pt-4 border-t border-amber-200 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Secure via Stripe
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Cancel anytime
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          7-day refund
        </span>
      </div>
    </section>
  );
}
