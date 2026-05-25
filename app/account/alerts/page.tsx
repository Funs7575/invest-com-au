import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AlertsClient from "./AlertsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rate Alerts — My Account",
  robots: "noindex, nofollow",
};

export default async function AccountAlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login?redirect=/account/alerts");
  }

  const email = user.email ?? "";
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("rate_alert_subscriptions")
    .select(
      "id, product_kind, threshold_bps, frequency, verified, last_notified_at, notification_count, created_at, unsubscribe_token",
    )
    .eq("email", email.toLowerCase())
    .order("created_at", { ascending: false });

  const alerts = rows ?? [];

  return (
    <div className="py-6 md:py-10">
      <div className="container-custom max-w-3xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/account" className="hover:text-slate-900">
            ← My account
          </Link>
        </nav>

        <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Rate Alerts</h1>
            <p className="text-sm text-slate-500">
              {alerts.length === 0
                ? "No active alerts"
                : `${alerts.length} alert${alerts.length === 1 ? "" : "s"} set up`}
            </p>
          </div>
          <Link
            href="/rate-alerts"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            + New alert
          </Link>
        </div>

        <AlertsClient alerts={alerts} userEmail={email} />
      </div>
    </div>
  );
}
