/**
 * /firm-portal/performance
 *
 * Firm-admin performance dashboard. Shows 30-day aggregate engagement
 * metrics and the current-month leaderboard ranking for every firm member.
 *
 * Auth: same two-stage gate as /firm-portal/billing —
 *   1. Supabase Auth session (createClient + getUser)
 *   2. Admin lookup to resolve the professionals row (handles auth_user_id OR
 *      email fallback for advisors not yet auth-linked)
 * Non-firm-admins are redirected to the advisor portal.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

// eslint-disable-next-line no-restricted-imports -- firm-admin authorization read of the CALLER'S OWN professionals row. Email-fallback match can't be expressed under auth.uid() RLS, so the session client would miss it. No cross-user data is read here — the heavy cross-member query is delegated to getFirmPerformanceSummary via service-role.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { resolveFirmAdminContext } from "@/lib/firm-billing";
import { getFirmPerformanceSummary, isoDate, currentYearMonth } from "@/lib/firm-performance";
import type { FirmPerformanceSummary } from "@/lib/firm-performance";
import FirmPerformanceClient from "./FirmPerformanceClient";

export const metadata: Metadata = {
  title: "Team performance — Firm Portal — Invest.com.au",
  description:
    "30-day engagement metrics and monthly leaderboard ranking for every advisor in your firm.",
  alternates: { canonical: `${SITE_URL}/firm-portal/performance` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FirmPerformancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?next=/firm-portal/performance");
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
    redirect("/pros/billing?notice=firm-only");
  }
  if (!pro.is_firm_admin) {
    redirect("/advisor-portal?notice=firm-admin-only");
  }

  const ctx = await resolveFirmAdminContext(pro.id);
  if (!ctx) {
    redirect("/advisor-portal?notice=firm-admin-only");
  }

  const fetched = await getFirmPerformanceSummary(ctx.firmId);

  // Fall back to empty summary if the query fails (e.g. cold start edge case).
  const now = new Date();
  const summary: FirmPerformanceSummary = fetched ?? {
    firmId: ctx.firmId,
    firmName: "",
    windowStart: isoDate(30, now),
    windowEnd: isoDate(0, now),
    yearMonth: currentYearMonth(now),
    totals: { views30d: 0, enquiries30d: 0, bookingClicks30d: 0 },
    members: [],
  };

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Firm portal" },
    { name: "Performance" },
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
            <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-2">
              <Link href="/firm-portal/billing" className="hover:text-slate-600">
                Firm portal
              </Link>
              <span className="mx-1.5" aria-hidden="true">/</span>
              <span className="text-slate-600">Performance</span>
            </nav>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Team performance
            </h1>
            {summary.firmName && (
              <p className="text-sm md:text-base text-slate-500 mt-1.5 leading-relaxed">
                {summary.firmName} — 30-day engagement and {summary.yearMonth} leaderboard.
              </p>
            )}
          </header>

          <FirmPerformanceClient summary={summary} />
        </div>
      </div>
    </>
  );
}
