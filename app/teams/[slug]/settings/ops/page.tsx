import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

// eslint-disable-next-line no-restricted-imports -- team-settings surface: cross-table read over members + professionals needs admin since anon RLS only exposes can_appear_publicly=true.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import OpsSettingsClient from "./OpsSettingsClient";

export const metadata: Metadata = {
  title: "Squad ops settings — Pro Squad",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TeamOpsSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/account/login?redirect=/teams/${slug}/settings/ops`);
  }

  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("professionals")
    .select("id")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();
  if (!caller) {
    redirect("/pros/join");
  }

  const { data: team } = await admin
    .from("expert_teams")
    .select(
      "id, slug, name, specialty_tags, auto_claim_mode, auto_claim_member_ids",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!team) notFound();

  const { data: membership } = await admin
    .from("expert_team_members")
    .select("status")
    .eq("team_id", team.id)
    .eq("professional_id", caller.id)
    .maybeSingle();
  if (!membership || (membership.status as string) !== "active") {
    notFound();
  }

  // Members list for the round-robin picker.
  const { data: rosterRaw } = await admin
    .from("expert_team_members")
    .select("professional_id")
    .eq("team_id", team.id)
    .eq("status", "active");
  const memberIds = ((rosterRaw ?? []) as { professional_id: number }[]).map(
    (r) => r.professional_id,
  );
  let nameById = new Map<number, string>();
  if (memberIds.length > 0) {
    const { data: pros } = await admin
      .from("professionals")
      .select("id, name")
      .in("id", memberIds);
    nameById = new Map(
      ((pros ?? []) as { id: number; name: string }[]).map((p) => [
        p.id,
        p.name,
      ]),
    );
  }
  const members = memberIds.map((id) => ({
    professional_id: id,
    name: nameById.get(id) ?? `Member #${id}`,
  }));

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-10">
      <div className="container-custom max-w-3xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link
            href={`/teams/${team.slug}`}
            className="hover:text-slate-900"
          >
            ← {team.name as string}
          </Link>
        </nav>
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">
            {team.name as string} — ops settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Specialty tags + auto-claim mode for accepted briefs.
          </p>
        </header>
        <OpsSettingsClient
          teamSlug={team.slug as string}
          initialSpecialtyTags={(team.specialty_tags as string[]) ?? []}
          initialAutoClaimMode={
            ((team.auto_claim_mode as string) ?? "manual") as
              | "manual"
              | "round_robin"
          }
          initialAutoClaimMemberIds={
            (team.auto_claim_member_ids as number[]) ?? []
          }
          members={members}
        />
      </div>
    </div>
  );
}
