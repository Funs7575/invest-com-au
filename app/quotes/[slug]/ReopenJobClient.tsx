"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

interface Props {
  slug: string;
  ownerEmailFromUrl: string;
}

export default function ReopenJobClient({ slug, ownerEmailFromUrl }: Props) {
  const [email, setEmail] = useState(ownerEmailFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function reopen() {
    if (!email.trim()) {
      setError("Enter the email you used when posting.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${slug}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_email: email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to re-open.");
      setDone(true);
      // Reload so the job page reflects open status + new ends_at
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <Icon name="check-circle" size={18} className="text-emerald-700" />
          <p className="text-sm font-bold text-emerald-900">Re-opened — refreshing…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
      <div className="flex items-start gap-2 mb-3">
        <Icon name="rotate-ccw" size={18} className="text-amber-700 mt-0.5" />
        <div>
          <p className="font-bold text-slate-900 text-sm">This request has expired</p>
          <p className="text-xs text-slate-700 leading-relaxed mt-0.5">
            You can re-open it for another 7 days if you still need a quote. Up to 2 re-opens per job.
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email you used to post"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={reopen}
          disabled={loading || !email.trim()}
          className="bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap"
        >
          {loading ? "Re-opening…" : "Re-open for 7 days"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
