/**
 * /firm-portal/jobs — firm-admin page for managing job posts.
 *
 * Auth: the firm portal layout enforces enforcePortalKind("advisor"), so only
 * authenticated advisors can reach this page. We additionally verify
 * is_firm_admin=true here and redirect non-admins to the advisor portal with a
 * notice.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- firm-admin authorization read of the CALLER'S OWN professionals row (user is verified via getUser() above). The email-fallback match (pros not yet auth-linked) can't be expressed under the auth.uid() RLS self-policy, so the session client would miss it; this mirrors resolveFirmAdmin() in app/api/firm-portal/jobs/route.ts. No cross-user data is read.
import { createAdminClient } from "@/lib/supabase/admin";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import JobsClient from "./JobsClient";

export const metadata: Metadata = {
  title: "Manage Job Posts — Firm Portal — Invest.com.au",
  description:
    "Create and manage open positions for your advisory firm. Reach qualified advisors across Australia.",
  alternates: { canonical: `${SITE_URL}/firm-portal/jobs` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FirmJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/firm-portal/jobs");
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
    { name: "Job posts" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="min-h-screen bg-slate-50 py-6 md:py-12">
        <div className="container-custom max-w-4xl">
          <header className="mb-6 md:mb-8">
            <nav
              aria-label="Breadcrumb"
              className="text-xs text-slate-500 mb-2"
            >
              <Link href="/firm-portal/billing" className="hover:text-slate-600">
                Firm portal
              </Link>
              <span className="mx-1.5" aria-hidden="true">/</span>
              <span className="text-slate-600">Job posts</span>
            </nav>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Job posts
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Create and manage open positions on the{" "}
              <Link
                href="/advisor-jobs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline"
              >
                advisor jobs board
              </Link>
              . Set status to{" "}
              <strong className="font-semibold">Active</strong> to make a post
              visible publicly.
            </p>
          </header>

          <JobsClient />
        </div>
      </div>
    </>
  );
}
