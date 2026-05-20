"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface EmbedCustomer {
  company_name: string | null;
  display_name: string | null;
  api_key_created_at: string | null;
  monthly_quota_requests: number;
  subscription_status: string | null;
  status: string;
}

export default function EmbedPortalHome() {
  const supabase = createClient();
  const [customer, setCustomer] = useState<EmbedCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("embed_customers")
        .select("company_name, display_name, api_key_created_at, monthly_quota_requests, subscription_status, status")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      setCustomer((data as EmbedCustomer | null) ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotate = async () => {
    setBusy(true);
    setError(null);
    setNewKey(null);
    try {
      const res = await fetch("/api/embed/rotate-key", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { api_key?: string; error?: string };
      if (!res.ok || !body.api_key) throw new Error(body.error ?? "Could not rotate key.");
      setNewKey(body.api_key);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rotate key.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <main className="p-8 text-sm text-slate-500">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">
        {customer?.company_name || customer?.display_name || "Embed portal"}
      </h1>
      <p className="text-sm text-slate-500 mb-8">White-label widget integration</p>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Monthly quota</p>
          <p className="text-sm font-semibold text-slate-900">
            {(customer?.monthly_quota_requests ?? 0).toLocaleString()} requests
          </p>
        </div>
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Subscription</p>
          <p className="text-sm font-semibold capitalize text-slate-900">
            {customer?.subscription_status ?? "none"}
          </p>
        </div>
      </div>

      <section className="border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">API key</h2>
        <p className="text-xs text-slate-500 mb-4">
          {customer?.api_key_created_at
            ? `Last rotated ${new Date(customer.api_key_created_at).toLocaleDateString("en-AU")}.`
            : "No key generated yet."}{" "}
          Keys are shown once at creation and stored only as a hash.
        </p>

        {newKey && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-emerald-900 mb-1 font-semibold">
              Copy this key now — it won&apos;t be shown again:
            </p>
            <code className="block text-xs font-mono break-all text-emerald-950">{newKey}</code>
          </div>
        )}

        <button
          onClick={rotate}
          disabled={busy}
          className="bg-teal-600 text-white font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? "Generating…" : customer?.api_key_created_at ? "Rotate key" : "Generate key"}
        </button>
        {error && <p className="text-xs text-red-700 mt-3" role="alert">{error}</p>}
      </section>
    </main>
  );
}
