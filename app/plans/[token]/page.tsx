import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { SITE_URL, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import { getPlanByToken } from "@/lib/getmatched/action-plans";
import { getResultTemplate } from "@/lib/getmatched/templates";
import type { IntentSlug, RouteType } from "@/lib/getmatched/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Your Investment Action Plan (${CURRENT_YEAR})`,
  robots: { index: false, follow: false },
};

export default async function PlanPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 20) notFound();
  const plan = await getPlanByToken(token);
  if (!plan) notFound();
  const template = plan.route
    ? await getResultTemplate(
        plan.route as RouteType,
        plan.intent_slug as IntentSlug | null,
      )
    : null;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Action Plan" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="min-h-screen bg-slate-50">
        <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
            <p className="text-amber-400 text-[11px] font-semibold uppercase tracking-widest mb-2">
              Your Investment Action Plan
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">
              {plan.goal ?? template?.headline ?? "Action Plan"}
            </h1>
            {template?.why_text && (
              <p className="text-slate-300 max-w-2xl leading-relaxed">
                {template.why_text}
              </p>
            )}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-md p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-2 mb-4 text-[11px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 w-fit">
              <Icon name="check-circle" size={12} />
              Route · {humanise(plan.route ?? "guide")}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-3">Your checklist</h2>
            <ul className="space-y-2 mb-6">
              {plan.checklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      item.done ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                    }`}
                  >
                    {item.done && (
                      <Icon name="check" size={12} className="text-white" />
                    )}
                  </span>
                  <span
                    className={`text-sm ${
                      item.done ? "text-slate-400 line-through" : "text-slate-700"
                    }`}
                  >
                    {item.href ? (
                      <Link href={item.href} className="hover:underline">
                        {item.label}
                      </Link>
                    ) : (
                      item.label
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {template?.primary_cta && (
              <Link
                href={
                  plan.id
                    ? `/briefs/new?plan_id=${plan.id}`
                    : template.primary_cta.href
                }
                className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base px-6 py-3.5 rounded-xl"
              >
                {template.primary_cta.label}
                <Icon name="arrow-right" size={16} />
              </Link>
            )}

            {plan.linked_brief_id && (
              <p className="mt-4 text-sm text-emerald-700">
                Brief #{plan.linked_brief_id} has already been created from this plan.
              </p>
            )}
          </div>

          <div className="text-center text-xs text-slate-500">
            Want to keep tracking this plan and any briefs you create?{" "}
            <Link href="/auth/sign-up" className="underline">
              Create a free account
            </Link>
            .
          </div>
        </section>
      </div>
    </>
  );
}

function humanise(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
