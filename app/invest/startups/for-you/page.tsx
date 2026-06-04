import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import { rankRounds } from "@/lib/startup-match";
import type { OpenRound, StartupProfileSnippet, StartupThesis } from "@/lib/startup-match";
import ForYouClient from "./ForYouClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Startup Deal Feed — For You",
  description: "Personalised startup round feed matched to your investment thesis.",
  robots: "noindex, nofollow",
};

export default async function StartupsForYouPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/invest/startups/for-you");

  // Fetch thesis, wholesale cert, and open rounds in parallel
  const [profileRes, certRes, roundsRes] = await Promise.all([
    supabase
      .from("investor_profiles")
      .select("meta, is_hnw")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
    supabase
      .from("wholesale_investor_certifications")
      .select("status, expires_at")
      .eq("user_id", user.id)
      .eq("status", "verified")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("startup_rounds")
      .select("id, startup_id, instrument, target_aud_cents, raised_aud_cents, min_ticket_aud_cents, wholesale_only, closes_at, status")
      .eq("status", "open"),
  ]);

  const meta = (profileRes.data?.meta as Record<string, unknown> | null) ?? {};
  const thesis = (meta.startup_thesis as StartupThesis | undefined) ?? null;
  const isHnw = profileRes.data?.is_hnw ?? false;
  const isWholesaleVerified =
    (certRes.data?.length ?? 0) > 0 || isHnw;

  const rounds = (roundsRes.data ?? []) as OpenRound[];

  // Fetch startup profiles for all unique startup_ids in open rounds
  const startupIds = [...new Set(rounds.map((r) => r.startup_id))];

  let profiles: StartupProfileSnippet[] = [];
  if (startupIds.length > 0) {
    const { data } = await supabase
      .from("startup_profiles")
      .select("id, company_name, slug, sector, stage, status, esic_eligible_self_attested, esic_verified_at")
      .in("id", startupIds)
      .eq("status", "active");
    profiles = (data ?? []) as StartupProfileSnippet[];
  }

  const hasThesis =
    thesis !== null &&
    (
      (thesis.sector_tags?.length ?? 0) > 0 ||
      (thesis.stage_preferences?.length ?? 0) > 0 ||
      thesis.min_ticket_aud != null ||
      thesis.max_ticket_aud != null
    );

  const scored = hasThesis
    ? rankRounds(rounds, profiles, thesis, isWholesaleVerified)
    : rankRounds(rounds, profiles, {}, isWholesaleVerified); // show all if no thesis

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <nav className="text-xs text-slate-500 mb-6">
        <Link href="/account/dashboard" className="hover:text-violet-600">Dashboard</Link>
        <span className="mx-1.5">/</span>
        <Link href="/invest/startups" className="hover:text-violet-600">Startups</Link>
        <span className="mx-1.5">/</span>
        <span>For You</span>
      </nav>

      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Startup Deal Feed</h1>
          <p className="text-sm text-slate-500 mt-1">
            Open rounds matched to your{" "}
            <Link href="/account/startup-thesis" className="text-violet-600 hover:underline">
              investment thesis
            </Link>
            .
          </p>
        </div>
        <Link
          href="/account/startup-thesis"
          className="shrink-0 text-sm px-4 py-2 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 font-medium"
        >
          Edit thesis
        </Link>
      </header>

      <ForYouClient
        rounds={scored}
        hasThesis={hasThesis}
        isWholesaleVerified={isWholesaleVerified}
      />
    </main>
  );
}
