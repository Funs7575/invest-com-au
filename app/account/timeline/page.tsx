import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loadTimeline, type TimelineItem } from "@/lib/account/timeline";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Timeline — Invest.com.au",
  alternates: { canonical: `${SITE_URL}/account/timeline` },
  robots: { index: false, follow: false },
};

const KIND_DOT: Record<TimelineItem["kind"], string> = {
  plan_started: "bg-slate-400",
  plan_saved: "bg-amber-500",
  brief_submitted: "bg-emerald-500",
  brief_accepted: "bg-emerald-600",
  quote_received: "bg-amber-600",
  consultation_booked: "bg-sky-500",
  outcome_submitted: "bg-violet-500",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export default async function AccountTimelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?redirect=/account/timeline");

  const items = await loadTimeline({
    authUserId: user.id,
    email: user.email ?? null,
  });

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <nav className="text-xs text-slate-500 mb-3">
        <Link href="/account" className="hover:underline">
          Account
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Timeline</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
        Your timeline
      </h1>
      <p className="text-sm text-slate-600 mb-8 leading-relaxed">
        Everything you&apos;ve done across plans, Match Requests, quotes, and
        consultations — newest first.
      </p>

      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500">
          Nothing here yet. Start with{" "}
          <Link href="/get-matched" className="text-amber-700 hover:underline">
            Get Matched
          </Link>{" "}
          to build your first action plan.
        </div>
      ) : (
        <ol className="relative border-l border-slate-200 pl-6 space-y-5">
          {items.map((it) => (
            <li key={it.id}>
              <span
                className={`absolute -left-[7px] w-3.5 h-3.5 rounded-full ring-4 ring-white ${KIND_DOT[it.kind]}`}
                aria-hidden
              />
              <Link
                href={it.href}
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-300 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {it.title}
                    </p>
                    {it.body && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {it.body}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {timeAgo(it.at)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
