import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getPlanById } from "@/lib/getmatched/action-plans";
import { getResultTemplate } from "@/lib/getmatched/templates";
import type { IntentSlug, RouteType } from "@/lib/getmatched/types";
import Icon from "@/components/Icon";
import SharePlanButton from "./SharePlanButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Action Plan — Invest.com.au",
  robots: "noindex, nofollow",
};

function humanise(s: string | null): string {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function MyPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const planId = Number(id);
  if (!Number.isFinite(planId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/account/plans/${planId}`);

  const plan = await getPlanById(planId);
  if (!plan || plan.auth_user_id !== user.id) notFound();

  const template = plan.route
    ? await getResultTemplate(
        plan.route as RouteType,
        plan.intent_slug as IntentSlug | null,
      )
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href="/account" className="hover:text-slate-700">
            Account
          </Link>
          <span>/</span>
          <Link href="/account/plans" className="hover:text-slate-700">
            Action plans
          </Link>
          <span>/</span>
          <span className="text-slate-700">{plan.goal ?? `#${plan.id}`}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          {plan.goal ?? "Investment Action Plan"}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {template?.why_text ??
            "Your saved action plan and any briefs you've created from it."}
        </p>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 w-fit mb-3">
            Route · {humanise(plan.route ?? null)}
          </p>
          <h2 className="text-base font-bold text-slate-900 mb-2">Your checklist</h2>
          <ul className="space-y-2 mb-4">
            {plan.checklist.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    item.done ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                  }`}
                >
                  {item.done && <Icon name="check" size={12} className="text-white" />}
                </span>
                {item.href ? (
                  <Link href={item.href} className="hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {plan.linked_brief_id ? (
              <Link
                href={`/briefs/${plan.linked_brief_id}`}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-lg"
              >
                <Icon name="check-circle" size={14} /> View Quote Status
              </Link>
            ) : (
              <Link
                href={`/briefs/new?plan_id=${plan.id}`}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-4 py-2.5 rounded-lg"
              >
                Get Quotes
                <Icon name="arrow-right" size={14} />
              </Link>
            )}
            <Link
              href={`/get-matched?plan_id=${plan.id}`}
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-lg"
            >
              <Icon name="edit" size={14} /> Edit answers
            </Link>
            <SharePlanButton shareToken={plan.share_token} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
            What we used
          </p>
          <dl className="text-sm text-slate-700 grid grid-cols-2 gap-2">
            <dt className="text-slate-500">Intent</dt>
            <dd>{humanise(plan.intent_slug ?? null)}</dd>
            <dt className="text-slate-500">Budget band</dt>
            <dd>{humanise(plan.budget_band ?? null)}</dd>
            <dt className="text-slate-500">Timeline</dt>
            <dd>{humanise(plan.timeline ?? null)}</dd>
            <dt className="text-slate-500">Location</dt>
            <dd>{plan.location_state ?? "—"}</dd>
            <dt className="text-slate-500">Help needed</dt>
            <dd>{plan.help_needed.length > 0 ? plan.help_needed.join(", ") : "—"}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd className="capitalize">{plan.status}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
