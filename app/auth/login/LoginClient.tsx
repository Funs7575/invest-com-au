"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Tab = "magic-link" | "password";

function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
    </svg>
  );
}

export default function LoginClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") || "/account";
  const callbackError = searchParams.get("error");

  const [tab, setTab] = useState<Tab>("magic-link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState(
    callbackError === "callback_failed"
      ? "Sign-in failed. Please try again."
      : ""
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !validateEmail(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
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

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !validateEmail(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (authError) {
        if (authError.message === "Invalid login credentials") {
          setError("Incorrect email or password.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      router.push(next);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !validateEmail(trimmed)) {
      setError("Please enter your email address first.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: authError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${siteUrl}/auth/reset-password`,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setResetSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="py-16">
        <div className="container-custom max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Check your email</h1>
            <p className="text-slate-600 text-sm mb-4">
              We sent a magic link to <span className="font-semibold text-slate-900">{email}</span>.
              Click the link in the email to sign in.
            </p>
            <p className="text-xs text-slate-400">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button
                onClick={() => { setSent(false); setError(""); }}
                className="text-slate-700 font-medium hover:underline"
              >
                try again
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="py-16">
        <div className="container-custom max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Check your email</h1>
            <p className="text-slate-600 text-sm mb-4">
              We sent a password reset link to <span className="font-semibold text-slate-900">{email}</span>.
              Click the link in the email to reset your password.
            </p>
            <p className="text-xs text-slate-400">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button
                onClick={() => { setResetSent(false); setError(""); }}
                className="text-slate-700 font-medium hover:underline"
              >
                try again
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="container-custom max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Sign in to Invest.com.au</h1>
            <p className="text-slate-500 text-sm">
              {tab === "magic-link"
                ? "Enter your email and we\u2019ll send you a magic link \u2014 no password needed."
                : "Sign in with your email and password."}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => { setTab("magic-link"); setError(""); }}
              className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                tab === "magic-link"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Magic Link
            </button>
            <button
              type="button"
              onClick={() => { setTab("password"); setError(""); }}
              className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                tab === "password"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Password
            </button>
          </div>

          {/* Magic Link Tab */}
          {tab === "magic-link" && (
            <form onSubmit={handleMagicLink} noValidate className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 mb-1">
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  autoComplete="email"
                  aria-required="true"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700/30 focus:border-blue-700"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Magic Link"}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {tab === "password" && (
            <form onSubmit={handlePasswordLogin} noValidate className="space-y-4">
              <div>
                <label htmlFor="login-pw-email" className="block text-sm font-semibold text-slate-700 mb-1">
                  Email address
                </label>
                <input
                  id="login-pw-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-required="true"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700/30 focus:border-blue-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    aria-required="true"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700/30 focus:border-blue-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-3 text-center">
            <p className="text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="font-semibold text-slate-900 hover:underline">
                Create one
              </Link>
            </p>
            <p className="text-xs text-slate-400">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="text-slate-700 hover:underline">Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-slate-700 hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>

        {next === "/pro" && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-sm text-amber-800">
              Sign in to subscribe to <span className="font-bold">Investor Pro</span> and unlock premium features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
