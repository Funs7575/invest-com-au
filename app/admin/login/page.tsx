"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirect)}`,
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Check your email</h1>
            <p className="text-slate-600 text-sm mb-4">
              We sent a sign-in link to{" "}
              <span className="font-semibold text-slate-900">{email}</span>.
              Click it to access the admin dashboard.
            </p>
            <p className="text-xs text-slate-400">
              Didn&apos;t get it? Check spam, or{" "}
              <button
                onClick={() => { setSent(false); setError(""); }}
                className="text-emerald-700 font-medium hover:underline"
              >
                try again
              </button>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Invest.com.au</h1>
          <p className="text-slate-500 text-sm mt-1">Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="admin-email" className="block text-sm font-semibold text-slate-700 mb-1">
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@invest.com.au"
              required
              autoFocus
              autoComplete="email"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Only @invest.com.au or authorised admin emails can access the dashboard.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Sign-In Link"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-4">
          Magic link sign-in — no password needed.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 animate-pulse shadow-sm">
            <div className="h-8 bg-slate-200 rounded w-32 mx-auto mb-2" />
            <div className="h-4 bg-slate-200 rounded w-56 mx-auto mb-8" />
            <div className="h-10 bg-slate-200 rounded w-full mb-4" />
            <div className="h-10 bg-slate-200 rounded w-full" />
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
