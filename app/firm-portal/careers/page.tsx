/**
 * /firm-portal/careers — firm-admin demand-probe page.
 *
 * Lets firm admins express interest in posting jobs ("I want to recruit").
 * This is a lightweight probe BEFORE building automated job-post workflows.
 * The submission records a revenue_opportunity row and fires a PostHog event
 * so demand can be measured before allocating engineering time.
 *
 * Auth: same two-stage firm-admin gate as /firm-portal/jobs.
 * Redirects non-firm-admins to /advisor-portal with a notice.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- firm-admin authorization read of the CALLER'S OWN professionals row (user verified via getUser()). The email-fallback match can't be expressed under the auth.uid() RLS self-policy; mirrors resolveFirmAdmin() pattern in app/api/firm-portal/jobs/route.ts.
import { createAdminClient } from "@/lib/supabase/admin";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import FirmCareersInterestForm from "./FirmCareersInterestForm";

export const metadata: Metadata = {
  title: "Careers & Hiring — Firm Portal — Invest.com.au",
  description:
    "Tell us you want to recruit advisors via Invest.com.au. Help us prioritise building the right tools for your firm.",
  alternates: { canonical: `${SITE_URL}/firm-portal/careers` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FirmPortalCareersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/firm-portal/careers");
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

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Firm portal" },
    { name: "Careers & hiring" },
  ]);

  const firmId = pro.firm_id as string;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="min-h-screen bg-slate-50 py-6 md:py-12">
        <div className="container-custom max-w-2xl">
          <header className="mb-6 md:mb-8">
            <nav
              aria-label="Breadcrumb"
              className="text-xs text-slate-400 mb-2"
            >
              <Link href="/firm-portal/billing" className="hover:text-slate-600">
                Firm portal
              </Link>
              <span className="mx-1.5" aria-hidden="true">
                /
              </span>
              <span className="text-slate-600">Careers &amp; hiring</span>
            </nav>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Hiring advisors?
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-lg">
              We&apos;re measuring how many firms want to recruit through
              Invest.com.au before building full posting tools. Tell us what
              you need and we&apos;ll prioritise accordingly.
            </p>
          </header>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 mb-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Express your interest
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              One click is enough — let us know your firm wants to hire and
              we&apos;ll be in touch when posting tools go live.
            </p>
            <FirmCareersInterestForm firmId={firmId} />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Already have a role to post?
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              The basic job-post tool is already live. You can create a post now
              and it will appear on the advisor jobs board once approved.
            </p>
            <Link
              href="/firm-portal/jobs"
              className="inline-block text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors"
            >
              Manage job posts →
            </Link>
          </div>

          <div className="text-xs text-slate-400">
            Questions?{" "}
            <a
              href="mailto:hello@invest.com.au"
              className="text-blue-600 hover:underline"
            >
              hello@invest.com.au
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
