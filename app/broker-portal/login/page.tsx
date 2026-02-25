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
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
          placeholder="you@broker.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
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
