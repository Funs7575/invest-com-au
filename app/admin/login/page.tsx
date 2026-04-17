"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LoginMode = "magic" | "password";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>("password");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleMagicLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://invest.com.au";

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

  const handlePassword = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (authError) {
        setError(authError.message === "Invalid login credentials" ? "Wrong email or password." : authError.message);
        setLoading(false);
        return;
      }

      window.location.href = redirect;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "magic") {
      await handleMagicLink();
    } else {
      await handlePassword();
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

        {/* Login mode toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
          <button
            type="button"
            onClick={() => { setMode("password"); setError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === "password" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setMode("magic"); setError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === "magic" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Magic Link
          </button>
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
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
            />
          </div>

          {mode === "password" && (
            <div>
              <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
              />
              <button
                type="button"
                onClick={async () => {
                  const trimmed = email.trim().toLowerCase();
                  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                    setError("Enter your email first, then click 'Reset password'.");
                    return;
                  }
                  setLoading(true);
                  setError("");
                  const supabase = createClient();
                  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://invest.com.au";
                  const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
                    redirectTo: `${siteUrl}/auth/callback?next=/admin`,
                  });
                  setLoading(false);
                  if (resetErr) { setError(resetErr.message); return; }
                  setSent(true);
                }}
                className="text-xs text-emerald-700 hover:underline mt-1.5 font-medium"
              >
                Forgot password? Set or reset it
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? (mode === "magic" ? "Sending..." : "Signing in...")
              : (mode === "magic" ? "Send Sign-In Link" : "Sign In")
            }
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-4">
          {mode === "magic"
            ? "We\u2019ll email you a one-time sign-in link."
            : "Use your admin email and password."
          }
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
