"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { createClient } from "@/lib/supabase/client";

function StatusBadge({ status, cancelAtPeriodEnd }: { status: string; cancelAtPeriodEnd: boolean }) {
  if (cancelAtPeriodEnd && status === "active") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        Cancelling
      </span>
    );
  }

  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trialing: "bg-blue-100 text-blue-700",
    past_due: "bg-red-100 text-red-700",
    canceled: "bg-slate-100 text-slate-500",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || styles.canceled}`}>
      {status === "active" ? "Active" : status === "trialing" ? "Trial" : status === "past_due" ? "Past Due" : "Cancelled"}
    </span>
  );
}

export default function AccountClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutSuccess = searchParams.get("checkout") === "success";

  const { user, subscription, isPro, loading, refresh } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(checkoutSuccess);
  const [prefs, setPrefs] = useState({
    email_newsletter: true,
    email_fee_alerts: true,
    email_deal_alerts: true,
    email_weekly_digest: true,
  });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Load email preferences from profiles table
  const loadPrefs = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("email_newsletter, email_fee_alerts, email_deal_alerts, email_weekly_digest")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          email_newsletter: data.email_newsletter ?? true,
          email_fee_alerts: data.email_fee_alerts ?? true,
          email_deal_alerts: data.email_deal_alerts ?? true,
          email_weekly_digest: data.email_weekly_digest ?? true,
        });
      }
    } catch {
      // Fall back to defaults silently
    } finally {
      setPrefsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  const savePrefs = async (newPrefs: typeof prefs) => {
    if (!user) return;
    setPrefsSaving(true);
    setPrefsSaved(false);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update(newPrefs)
      .eq("id", user.id);
    setPrefs(newPrefs);
    setPrefsSaving(false);
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  };

  const togglePref = (key: keyof typeof prefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    savePrefs(newPrefs);
  };

  // Poll for subscription after checkout success
  useEffect(() => {
    if (!checkoutSuccess || !user) return;

    // Webhook may not have fired yet — poll a few times
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      await refresh();
      if (attempts >= 6) clearInterval(interval); // Stop after 12 seconds
    }, 2000);

    return () => clearInterval(interval);
  }, [checkoutSuccess, user, refresh]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login?next=/account");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="py-16">
        <div className="container-custom max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="h-40 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/create-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error || "Failed to open billing portal.");
        setPortalLoading(false);
      }
    } catch {
      setPortalError("Something went wrong. Please try again.");
      setPortalLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setSignOutLoading(false);
    }
  };

  return (
    <div className="py-12">
      <div className="container-custom max-w-2xl">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-6">My Account</h1>

        {/* Checkout success banner */}
        {showSuccessBanner && isPro && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-green-800">Welcome to Investor Pro!</p>
              <p className="text-xs text-green-700 mt-0.5">
                Your subscription is active. You now have access to all premium features.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessBanner(false)}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Processing banner */}
        {showSuccessBanner && !isPro && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-blue-700">Processing your subscription... This usually takes a few seconds.</p>
            </div>
          </div>
        )}

        {/* Profile */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Signed in as</p>
              <p className="text-sm font-semibold text-slate-900">{user.email}</p>
            </div>
            {isPro && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                PRO
              </div>
            )}
          </div>
        </div>

        {/* Subscription */}
        {subscription ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Subscription</h2>
              <StatusBadge status={subscription.status} cancelAtPeriodEnd={subscription.cancel_at_period_end} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Plan</p>
                <p className="text-sm font-semibold text-slate-900">
                  Investor Pro ({subscription.plan_interval === "year" ? "Yearly" : "Monthly"})
                </p>
              </div>
              {subscription.current_period_end && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">
                    {subscription.cancel_at_period_end ? "Access until" : "Renews on"}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(subscription.current_period_end).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>

            {subscription.cancel_at_period_end && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-700">
                  Your subscription has been cancelled and will end at the end of your current billing period.
                  You can resubscribe anytime.
                </p>
              </div>
            )}

            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {portalLoading ? "Opening..." : "Manage Subscription"}
            </button>
            {portalError && (
              <p className="mt-2 text-xs text-red-500">{portalError}</p>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-50 to-amber-50 border border-slate-200 rounded-xl p-6 mb-4 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-3">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              UPGRADE
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Unlock Investor Pro</h3>
            <p className="text-sm text-slate-600 mb-4">
              Get fee alerts, advanced tools, monthly market briefs, and an ad-free experience.
            </p>
            <Link
              href="/pro"
              className="inline-block px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
            >
              View Plans
            </Link>
          </div>
        )}

        {/* Email Preferences */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Email Preferences</h2>
            {prefsSaved && (
              <span className="text-xs text-green-600 font-medium">✓ Saved</span>
            )}
            {prefsSaving && (
              <span className="text-xs text-slate-400">Saving...</span>
            )}
          </div>

          {prefsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <PreferenceToggle
                label="Weekly Newsletter"
                description="Fee changes, new articles, and broker deals every Monday"
                checked={prefs.email_weekly_digest}
                onChange={() => togglePref("email_weekly_digest")}
              />
              <PreferenceToggle
                label="Fee Change Alerts"
                description="Get notified when any broker changes their fees"
                checked={prefs.email_fee_alerts}
                onChange={() => togglePref("email_fee_alerts")}
                pro={!isPro}
              />
              <PreferenceToggle
                label="Deal Alerts"
                description="New broker deals and limited-time offers"
                checked={prefs.email_deal_alerts}
                onChange={() => togglePref("email_deal_alerts")}
              />
              <PreferenceToggle
                label="Product Updates"
                description="New features and tools on Invest.com.au"
                checked={prefs.email_newsletter}
                onChange={() => togglePref("email_newsletter")}
              />
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Quick Links</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/shortlist" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <span>❤️</span> My Shortlist
            </Link>
            <Link href="/compare" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <span>📊</span> Compare
            </Link>
            <Link href="/calculators" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <span>🧮</span> Calculators
            </Link>
            <Link href="/quiz" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <span>🎯</span> Broker Quiz
            </Link>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          disabled={signOutLoading}
          className="text-sm text-slate-400 hover:text-red-500 transition-colors min-h-[36px]"
        >
          {signOutLoading ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </div>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
  pro,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  pro?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          {pro && (
            <span className="text-[0.62rem] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">PRO</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={pro}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
          pro
            ? "bg-slate-100 cursor-not-allowed"
            : checked
            ? "bg-green-500"
            : "bg-slate-200"
        }`}
        role="switch"
        aria-checked={checked}
        aria-label={`${label} ${checked ? "enabled" : "disabled"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked && !pro ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
