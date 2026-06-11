"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BrokerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Verify this user has a broker account
      const { data: account } = await supabase
        .from("broker_accounts")
        .select("id, status")
        .maybeSingle();

      if (!account) {
        setError("No broker account found for this email.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (account.status === "pending") {
        setError("Your account is pending approval. Please contact us.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (account.status === "suspended") {
        setError("Your account has been suspended. Please contact support.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Update last login
      await supabase
        .from("broker_accounts")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", account.id);

      router.push("/broker-portal");
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-5" style={{ animation: "resultCardIn 0.4s ease-out" }}>
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Sign In</h2>
        <p className="text-sm text-slate-500">
          Access your broker advertising dashboard
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="bp-login-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          id="bp-login-email"
          type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
          placeholder="you@broker.com"
        />
      </div>

      <div>
        <label htmlFor="bp-login-password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <div className="relative">
          <input
            id="bp-login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 pr-11 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword
              ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
              : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            }
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <p className="text-xs text-slate-400 text-center">
        Don&apos;t have an account?{" "}
        <a href="/broker-portal/register" className="text-slate-700 underline font-medium">
          Apply to advertise →
        </a>
      </p>
    </form>
  );
}
