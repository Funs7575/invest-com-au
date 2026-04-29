"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface QARow {
  id: number;
  advisor_id: number | null;
  author_display_name: string;
  body: string;
  is_question: boolean;
  parent_id: number | null;
  created_at: string;
  professionals: { slug: string; type: string; verified: boolean } | null;
}

interface Props {
  slug: string;
  initial: QARow[];
  ownerEmailFromUrl: string;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function QuoteQAClient({ slug, initial, ownerEmailFromUrl }: Props) {
  const [items, setItems] = useState<QARow[]>(initial);
  const [body, setBody] = useState("");
  const [email, setEmail] = useState(ownerEmailFromUrl);
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 4) {
      setErr("Please write at least 4 characters.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const payload: Record<string, unknown> = { body: body.trim() };
      if (email) {
        payload.contact_email = email;
        if (displayName.trim()) payload.display_name = displayName.trim();
      }
      const res = await fetch(`/api/quotes/${slug}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to post.");
      // Refresh
      const fresh = await fetch(`/api/quotes/${slug}/qa`).then((r) => r.json());
      setItems(fresh.qa ?? []);
      setBody("");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-slate-900">
          Q&amp;A <span className="text-slate-400 font-normal">({items.length})</span>
        </h2>
        <span className="text-xs text-slate-500">Public — visible to everyone</span>
      </div>

      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
        Advisors can clarify scope or ask follow-ups here. Owner can answer using the email they posted with.
        No private contact info is shared.
      </p>

      <div className="space-y-3 mb-6">
        {items.length === 0 && (
          <p className="text-sm text-slate-400 italic">No questions yet.</p>
        )}
        {items.map((q) => (
          <div key={q.id} className="border-l-2 border-slate-200 pl-3 py-1">
            <div className="flex items-center gap-2 text-xs mb-0.5">
              <span className="font-semibold text-slate-800">
                {q.professionals?.slug ? (
                  <Link href={`/advisor/${q.professionals.slug}`} className="hover:underline">
                    {q.author_display_name}
                  </Link>
                ) : (
                  q.author_display_name
                )}
              </span>
              {q.professionals?.verified && (
                <Icon name="badge-check" size={11} className="text-emerald-600" aria-label="Verified advisor" />
              )}
              {q.advisor_id && (
                <span className="text-[10px] uppercase tracking-wider bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                  Advisor
                </span>
              )}
              <span className="text-slate-400">{timeAgo(q.created_at)}</span>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{q.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="border-t border-slate-100 pt-4 space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Ask a clarifying question or post a public answer…"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (only the owner needs to enter this)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name (e.g. Jane S.)"
            maxLength={80}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <p className="text-xs text-slate-400">
          Verified advisors don&apos;t need an email — just <Link href="/advisor-portal" className="underline">log in</Link>.
        </p>
        <button
          type="submit"
          disabled={submitting || body.trim().length < 4}
          className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-bold px-4 py-2 rounded-lg"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </form>
    </div>
  );
}
