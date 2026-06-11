import type { Metadata } from "next";
import { notFound } from "next/navigation";

// eslint-disable-next-line no-restricted-imports -- anonymous token surface: the check-in link is the auth factor (same model as /outcome/[token]); provider/brief hydration needs service-role reads.
import { createAdminClient } from "@/lib/supabase/admin";
import { getEngagementByToken, isAnnualStage } from "@/lib/briefs/engagements";
import { SITE_URL } from "@/lib/seo";
import EngagementClient from "./EngagementClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check-in — Invest.com.au",
  description: "Tell us where things stand with your pro.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/engagement` },
};

export default async function EngagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const engagement = await getEngagementByToken(token);
  if (!engagement) notFound();

  // Hydrate display names (no PII beyond what the consumer already knows).
  const admin = createAdminClient();
  let providerName = "your pro";
  if (engagement.team_id) {
    const { data } = await admin
      .from("expert_teams")
      .select("name")
      .eq("id", engagement.team_id)
      .maybeSingle();
    if (data?.name) providerName = data.name as string;
  } else if (engagement.professional_id) {
    const { data } = await admin
      .from("professionals")
      .select("name")
      .eq("id", engagement.professional_id)
      .maybeSingle();
    if (data?.name) providerName = data.name as string;
  }
  const { data: brief } = await admin
    .from("advisor_auctions")
    .select("job_title")
    .eq("id", engagement.brief_id)
    .maybeSingle();

  const requestedStatus = typeof sp.status === "string" ? sp.status : null;
  // The annual form shows when the annual touch has gone out (stage past
  // ANNUAL_STAGE), when the email's annual link was followed, or when a
  // review was already submitted (so the consumer can see what they said).
  const showAnnual =
    sp.annual === "1" ||
    isAnnualStage(engagement.checkin_stage - 1) ||
    engagement.annual_review_at !== null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-16">
        <p className="text-amber-600 text-[11px] font-bold uppercase tracking-widest mb-2">
          {showAnnual ? "Annual adviser review" : "Quick check-in"}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          {showAnnual ? "A year on — how has it been?" : "Where do things stand?"}
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Re: <strong>{(brief?.job_title as string) || "your Match Request"}</strong>{" "}
          with <strong>{providerName}</strong>. One tap keeps your account up to
          date — your answers are confidential and never shown publicly.
        </p>
        <EngagementClient
          token={token}
          currentStatus={engagement.status}
          requestedStatus={requestedStatus}
          showAnnual={showAnnual}
          annualSubmitted={engagement.annual_review_at !== null}
          initialRating={engagement.annual_rating}
          initialFeeBand={engagement.annual_fee_band}
        />
        <p className="mt-8 text-[11px] text-slate-400">
          General information only — nothing on this page is a recommendation
          to keep or change providers.
        </p>
      </div>
    </div>
  );
}
