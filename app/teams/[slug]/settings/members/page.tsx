import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- members console needs the team row + caller's membership across tables before rendering; page redirects non-members first, admin client only reads team-scoped data.
import { createAdminClient } from "@/lib/supabase/admin";
import TeamMembersClient from "./TeamMembersClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Team members — Invest.com.au",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeamMembersPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/account/login?redirect=/teams/${slug}/settings/members`);

  const admin = createAdminClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("id, name, owner_professional_id, lead_professional_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!team) notFound();

  const { data: prof } = await admin
    .from("professionals")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const profId = (prof?.id as number | undefined) ?? null;
  if (!profId) redirect("/pros/join");

  const { data: membership } = await admin
    .from("expert_team_members")
    .select("member_role, status")
    .eq("team_id", team.id)
    .eq("professional_id", profId)
    .maybeSingle();

  const isMember =
    membership?.status === "active" ||
    team.owner_professional_id === profId ||
    team.lead_professional_id === profId;
  if (!isMember) notFound();

  const isAdmin =
    team.owner_professional_id === profId ||
    team.lead_professional_id === profId ||
    (membership?.status === "active" && membership?.member_role === "lead");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">{team.name} — Members</h1>
      <p className="text-sm text-slate-500 mb-6">
        {isAdmin ? "Manage your team roster and invite advisors." : "Your team roster."}
      </p>
      <TeamMembersClient teamId={team.id} slug={slug} isAdmin={isAdmin} />
    </main>
  );
}
