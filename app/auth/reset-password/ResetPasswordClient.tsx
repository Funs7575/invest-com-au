"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // Supabase automatically picks up the recovery token from the URL hash
  // when the user clicks the reset link in their email
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setSessionReady(true);
        } else if (event === "SIGNED_IN") {
          // User already has a session — they may have arrived here directly
          setSessionReady(true);
        }
      }
    );

    // Also check if there's already a session (e.g., from a recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        // Give a moment for the auth state change to fire
        setTimeout(() => {
          setSessionError(true);
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getStrength = (): { label: string; color: string; width: string } => {
    if (password.length === 0) return { label: "", color: "bg-slate-200", width: "w-0" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "w-1/3" };
    if (score <= 3) return { label: "Fair", color: "bg-amber-500", width: "w-2/3" };
    return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength();

  if (success) {
    return (
      <div className="py-16">
        <div className="container-custom max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Password updated</h1>
            <p className="text-slate-600 text-sm mb-6">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <button
              onClick={() => router.push("/account")}
              className="w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Go to My Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (sessionError && !sessionReady) {
    return (
      <div className="py-16">
        <div className="container-custom max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Invalid or expired link</h1>
            <p className="text-slate-600 text-sm mb-6">
              This password reset link has expired or is invalid. Please request a new one.
            </p>
            <Link
              href="/auth/login"
              className="inline-block w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors text-center"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="py-16">
        <div className="container-custom max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mx-auto mb-2" />
            <div className="h-4 bg-slate-200 rounded w-64 mx-auto mb-6" />
            <div className="h-10 bg-slate-200 rounded w-full mb-4" />
            <div className="h-10 bg-slate-200 rounded w-full" />
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
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Set a new password</h1>
            <p className="text-slate-500 text-sm">
              Choose a strong password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  autoFocus
                  autoComplete="new-password"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700/30 focus:border-blue-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} ${strength.width} rounded-full transition-all duration-300`} />
                  </div>
                  <p className={`text-xs mt-1 ${strength.color === "bg-red-500" ? "text-red-500" : strength.color === "bg-amber-500" ? "text-amber-600" : "text-emerald-600"}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-700 mb-1">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                autoComplete="new-password"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700/30 focus:border-blue-700"
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || password.length < 8 || password !== confirmPassword}
              className="w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
