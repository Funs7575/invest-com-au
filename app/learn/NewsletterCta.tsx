"use client";

import { useState, type FormEvent } from "react";
import Icon from "@/components/Icon";

export default function NewsletterCta() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "learn_hub" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "Could not subscribe — try again.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error — try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <Icon name="check-circle" size={28} className="text-emerald-600 mx-auto mb-2" />
        <p className="font-bold text-emerald-900">Subscribed — check your inbox to confirm.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">Get the weekly Australian investor newsletter</h2>
      <p className="text-sm text-slate-600 mb-4">One email a week. Tax windows, deal alerts and the most-read guides — no fluff.</p>
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-900 font-extrabold text-sm px-5 py-2.5 transition-colors"
        >
          {submitting ? "…" : "Subscribe"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="text-[11px] text-slate-500 leading-relaxed mt-3">Double opt-in. Unsubscribe at any time. We never share your email.</p>
    </div>
  );
}
