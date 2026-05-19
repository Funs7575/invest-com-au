import type { Metadata } from "next";
import { redirect } from "next/navigation";

// eslint-disable-next-line no-restricted-imports -- Firm-admin billing surface: needs to look up the calling pro's row regardless of status to gate on is_firm_admin (the anon RLS policy only exposes status='active' + visibility-filtered rows). Mirrors app/pros/billing/page.tsx.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { getFirmBillingSummary } from "@/lib/firm-billing";

import FirmBillingClient from "./FirmBillingClient";

export const metadata: Metadata = {
  title: "Firm billing — Invest.com.au",
  description:
    "Aggregate Match Request credit balance for your firm, per-member breakdown and shared payment method management.",
  alternates: { canonical: `${SITE_URL}/firm-portal/billing` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FirmBillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/firm-portal/billing");
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id, firm_id, is_firm_admin, status")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();

  if (!pro) {
    redirect("/pros/join");
  }

  if (!pro.firm_id) {
    // Member of no firm — redirect to the personal billing page so they
    // have somewhere useful to land.
    redirect("/pros/billing");
  }

  if (!pro.is_firm_admin) {
    // Firm member but not admin — show a passive notice page rather than
    // 403ing. The personal billing page is the right surface for them.
    redirect("/pros/billing?notice=firm-admin-only");
  }

  const summary = await getFirmBillingSummary(pro.firm_id);
  if (!summary) {
    redirect("/pros/billing");
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Firm portal" },
    { name: "Billing" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="min-h-screen bg-slate-50 py-6 md:py-12">
        <div className="container-custom max-w-5xl">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Firm billing
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1.5 leading-relaxed">
              {summary.firmName} — aggregate Match Request credits across
              {" "}
              {summary.activeMemberCount}{" "}
              {summary.activeMemberCount === 1 ? "member" : "members"}.
            </p>
          </header>

          <FirmBillingClient summary={summary} />
        </div>
      </div>
    </>
  );
}
