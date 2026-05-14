import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { listPlansForUser } from "@/lib/getmatched/action-plans";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Action Plans — Invest.com.au",
  robots: "noindex, nofollow",
};

function humanise(s: string | null): string {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function MyPlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/account/plans");

  const plans = await listPlansForUser(user.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href="/account" className="hover:text-slate-700">
            Account
          </Link>
          <span>/</span>
          <span className="text-slate-700">Action plans</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          My Action Plans
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Plans you&apos;ve created via Get Matched. Each one carries your route, checklist, and any briefs you sent.
        </p>

        <div className="mb-6">
          <Link
            href="/get-matched"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-4 py-2 rounded-lg"
          >
            <Icon name="plus" size={14} /> Build a new plan
          </Link>
        </div>

        {plans.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-600">
              You don&apos;t have any action plans yet. Build one in under a minute.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((p) => (
              <article
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      {humanise(p.intent_slug ?? null)} · {humanise(p.route ?? null)}
                    </p>
                    <h2 className="text-base font-bold text-slate-900">
                      {p.goal ?? "Investment Action Plan"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Created {new Date(p.created_at).toLocaleDateString()} ·{" "}
                      <span
                        className={`uppercase font-semibold ${
                          p.status === "converted"
                            ? "text-emerald-700"
                            : p.status === "saved"
                              ? "text-slate-700"
                              : "text-slate-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/account/plans/${p.id}`}
                      className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md"
                    >
                      Open
                    </Link>
                    {p.linked_brief_id && (
                      <Link
                        href={`/briefs/${p.linked_brief_id}`}
                        className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-md"
                      >
                        View linked brief
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
