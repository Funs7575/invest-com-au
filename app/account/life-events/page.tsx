import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import { LIFE_EVENTS, LIFE_EVENT_CATEGORIES } from "@/lib/life-events";
import { getCompletedCount, getChecklist } from "@/lib/life-event-checklist";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Life Event Checklists — My Account",
  robots: "noindex, nofollow",
};

interface WizardState {
  life_event_id: string;
  step: number;
  form_data: { completed?: string[]; [key: string]: unknown };
  updated_at: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function LifeEventsPage() {
  const supabase = await createClient();
  await enforcePortalKind("investor");

  const { data: { user } } = await supabase.auth.getUser();
  const states: WizardState[] = [];

  if (user) {
    const { data } = await supabase
      .from("life_event_wizard_state")
      .select("life_event_id, step, form_data, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (data) states.push(...(data as WizardState[]));
  }

  const stateByEventId = new Map(states.map((s) => [s.life_event_id, s]));
  const inProgress = states.filter((s) => {
    const steps = getChecklist(s.life_event_id);
    const done = getCompletedCount(s.life_event_id, s.form_data);
    return done > 0 && done < steps.length;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-extrabold text-slate-900">Life Event Checklists</h1>
          <Link href="/account" className="text-xs text-slate-500 hover:text-slate-900">
            ← Back to account
          </Link>
        </div>
        <p className="text-sm text-slate-600 max-w-xl">
          Step-by-step checklists to guide you through major financial decisions. Your progress
          is saved automatically.
        </p>
      </header>

      {/* In-progress section */}
      {inProgress.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-700 mb-3">
            In progress
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inProgress.map((state) => {
              const event = LIFE_EVENTS.find((e) => e.id === state.life_event_id);
              if (!event) return null;
              const total = getChecklist(event.id).length;
              const done = getCompletedCount(event.id, state.form_data);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <Link
                  key={event.id}
                  href={`/account/life-events/${event.id}`}
                  className="block bg-white border border-indigo-200 rounded-xl p-4 hover:border-indigo-400 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{event.emoji}</span>
                    <span className="text-sm font-bold text-slate-900">{event.title}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-500">{done}/{total} steps · last updated {fmtDate(state.updated_at)}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* All events by category */}
      {LIFE_EVENT_CATEGORIES.map((cat) => {
        const events = LIFE_EVENTS.filter((e) => e.category === cat.id);
        return (
          <section key={cat.id} className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              {cat.emoji} {cat.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {events.map((event) => {
                const state = stateByEventId.get(event.id);
                const steps = getChecklist(event.id);
                const done = state ? getCompletedCount(event.id, state.form_data) : 0;
                const total = steps.length;
                const hasProgress = done > 0;
                const isComplete = total > 0 && done === total;

                return (
                  <Link
                    key={event.id}
                    href={`/account/life-events/${event.id}`}
                    className="flex items-start gap-3 bg-white border border-slate-200 hover:border-indigo-200 rounded-xl p-4 transition-colors"
                  >
                    <span className="text-lg mt-0.5 shrink-0">{event.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{event.title}</span>
                        {isComplete && (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Done</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{event.subtitle}</p>
                      {hasProgress && !isComplete && (
                        <p className="text-xs text-indigo-600 font-semibold mt-0.5">{done}/{total} steps</p>
                      )}
                      {!hasProgress && total > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">{total} step checklist</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
