import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import { LIFE_EVENTS } from "@/lib/life-events";
import { getChecklist } from "@/lib/life-event-checklist";
import LifeEventWizard from "@/components/LifeEventWizard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const event = LIFE_EVENTS.find((e) => e.id === eventId);
  return {
    title: event ? `${event.title} Checklist — My Account` : "Life Event Checklist",
    robots: "noindex, nofollow",
  };
}

interface WizardState {
  life_event_id: string;
  step: number;
  form_data: { completed?: string[]; [key: string]: unknown };
  updated_at: string;
}

export default async function LifeEventWizardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = LIFE_EVENTS.find((e) => e.id === eventId);
  if (!event) notFound();

  const supabase = await createClient();
  await enforcePortalKind("investor");

  const { data: { user } } = await supabase.auth.getUser();

  let wizardState: WizardState | null = null;
  if (user) {
    const { data } = await supabase
      .from("life_event_wizard_state")
      .select("life_event_id, step, form_data, updated_at")
      .eq("user_id", user.id)
      .eq("life_event_id", eventId)
      .maybeSingle();
    wizardState = data as WizardState | null;
  }

  const steps = getChecklist(event.id);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6">
        <Link href="/account" className="hover:text-slate-900">Account</Link>
        <span className="text-slate-300">/</span>
        <Link href="/account/life-events" className="hover:text-slate-900">Life events</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium">{event.title}</span>
      </nav>

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{event.emoji}</span>
          <h1 className="text-2xl font-extrabold text-slate-900">{event.title}</h1>
        </div>
        <p className="text-sm text-slate-600">{event.subtitle}</p>
        {steps.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            Checklist steps are being prepared for this event. Check back soon.
          </p>
        )}
      </header>

      <LifeEventWizard
        event={event}
        initialFormData={wizardState?.form_data ?? {}}
      />
    </div>
  );
}
