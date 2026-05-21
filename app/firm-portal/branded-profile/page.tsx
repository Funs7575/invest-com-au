import type { Metadata } from "next";
import { redirect } from "next/navigation";

// eslint-disable-next-line no-restricted-imports -- Firm-admin upgrade surface: looks up the calling pro's row regardless of status to gate on is_firm_admin (the anon RLS policy only exposes status='active' + visibility-filtered rows). Mirrors app/firm-portal/billing/page.tsx.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { getBrandedProfileState } from "@/lib/firm-branded-profile";

import BrandedProfileClient from "./BrandedProfileClient";

export const metadata: Metadata = {
  title: "Branded firm profile — Invest.com.au",
  description:
    "Upgrade your firm's directory profile with a custom hero, featured specialties and a booking embed.",
  alternates: { canonical: `${SITE_URL}/firm-portal/branded-profile` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BrandedProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/firm-portal/branded-profile");
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
    redirect("/pros/billing");
  }
  if (!pro.is_firm_admin) {
    redirect("/pros/billing?notice=firm-admin-only");
  }

  const state = await getBrandedProfileState(pro.firm_id);
  if (!state) {
    redirect("/firm-portal/billing");
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Firm portal" },
    { name: "Branded profile" },
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
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Branded firm profile
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1.5 leading-relaxed">
              {state.firmName} — stand out in the advisor directory with a
              custom hero, featured specialties and a booking embed on your{" "}
              <a
                href={`/firm/${state.firmSlug}`}
                className="text-violet-700 hover:text-violet-900 underline underline-offset-2"
              >
                public profile
              </a>
              .
            </p>
          </header>

          <BrandedProfileClient state={state} />
        </div>
      </div>
    </>
  );
}
