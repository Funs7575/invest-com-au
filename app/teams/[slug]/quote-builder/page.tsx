import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- squad members verify membership via cross-table join; same pattern as the dashboard page.
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/seo";
import QuoteBuilderForm from "./QuoteBuilderForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Send a fixed-price quote — Invest.com.au",
  alternates: { canonical: `${SITE_URL}/teams/quote-builder` },
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ brief?: string }>;
}

export default async function QuoteBuilderPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const briefId = sp.brief ? Number(sp.brief) : null;
  if (!briefId || !Number.isFinite(briefId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/account/login?redirect=/teams/${slug}/quote-builder?brief=${briefId}`);
  }

  const admin = createAdminClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!team) notFound();

  // Verify the calling user is an active member of this squad.
  const { data: pro } = await admin
    .from("professionals")
    .select("id")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();
  if (!pro) redirect("/pros/join");

  const { data: membership } = await admin
    .from("expert_team_members")
    .select("id")
    .eq("team_id", team.id)
    .eq("professional_id", pro.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) notFound();

  // Verify the brief is accepted by this squad.
  const { data: brief } = await admin
    .from("advisor_auctions")
    .select("id, job_title, brief_template, budget_band, accepted_by_team_id, status")
    .eq("id", briefId)
    .maybeSingle();
  if (!brief || brief.accepted_by_team_id !== team.id || brief.status !== "open") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-amber-600 text-[11px] font-bold uppercase tracking-widest mb-2">
          Quote builder
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          Send a fixed-price quote
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          For <strong>{brief.job_title}</strong> · {brief.brief_template ?? "general"} ·{" "}
          {brief.budget_band ? brief.budget_band.replace(/_/g, " ") : "budget not set"}
        </p>
        <QuoteBuilderForm
          slug={slug}
          briefId={brief.id as number}
        />
      </div>
    </div>
  );
}
