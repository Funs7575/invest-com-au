import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- advisor-portal surface gates on session-resolved professional; outbound_webhook_endpoints is service-role-only per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { listEndpoints } from "@/lib/outbound-webhooks";

import { ALLOWED_EVENTS } from "@/app/api/advisor-portal/webhooks/route";
import WebhooksClient from "./WebhooksClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Webhooks — Advisor portal",
  robots: { index: false, follow: false },
};

export default async function AdvisorPortalWebhooksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/advisor-portal/webhooks");
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();
  if (!pro) {
    redirect("/pros/join");
  }
  const advisorId = (pro as { id: number }).id;

  const endpoints = await listEndpoints("professional", String(advisorId));

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-10">
      <div className="container-custom max-w-3xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link
            href="/advisor-portal"
            className="hover:text-slate-900"
          >
            ← Advisor portal
          </Link>
        </nav>
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Webhooks</h1>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            Send signed POSTs to your own URL when briefs change. Wire your
            CRM, Slack, Zapier, or a custom integration without us building
            anything per-provider.
          </p>
        </header>
        <WebhooksClient
          initialEndpoints={endpoints.map((e) => ({
            id: e.id,
            url: e.url,
            enabled: e.enabled,
            event_subscriptions: e.event_subscriptions,
          }))}
          allowedEvents={ALLOWED_EVENTS}
        />
      </div>
    </div>
  );
}
