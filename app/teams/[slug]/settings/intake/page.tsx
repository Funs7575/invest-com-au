import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

// eslint-disable-next-line no-restricted-imports -- Team-settings surface: we need to look up the team + check active membership across professionals/expert_team_members which anon-RLS can't see for non-public teams.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";
import { listForTeam, MAX_QUESTIONS_PER_OWNER } from "@/lib/pro-intake";
import { isProfessionalOnTeam } from "@/lib/expert-teams";

import IntakeQuestionsEditor from "../../../../pros/settings/intake/IntakeQuestionsEditor";

export const metadata: Metadata = {
  title: "Team intake questions — Invest.com.au",
  description: "Customise the questions a consumer must answer after accepting your team brief.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/teams` },
};

export const dynamic = "force-dynamic";

export default async function TeamIntakeSettingsPage({
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
    redirect(`/account/login?redirect=/teams/${slug}/settings/intake`);
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();
  if (!pro) {
    redirect("/pros/join");
  }
  const advisor = pro as { id: number };

  const { data: team } = await admin
    .from("expert_teams")
    .select("id, name, slug, owner_professional_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!team) notFound();
  const teamRow = team as {
    id: number;
    name: string;
    slug: string;
    owner_professional_id: number;
  };

  const isMember =
    teamRow.owner_professional_id === advisor.id ||
    (await isProfessionalOnTeam(teamRow.id, advisor.id));
  if (!isMember) {
    redirect(`/teams/${slug}`);
  }

  const questions = await listForTeam(teamRow.id);

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-12">
      <div className="container-custom max-w-3xl">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href="/" className="hover:text-slate-700">
            Home
          </Link>
          <span>/</span>
          <Link href={`/teams/${teamRow.slug}`} className="hover:text-slate-700">
            {teamRow.name}
          </Link>
          <span>/</span>
          <span className="text-slate-700">Intake questions</span>
        </div>

        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            {teamRow.name} — intake questions
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1.5 leading-relaxed">
            Up to {MAX_QUESTIONS_PER_OWNER} prompts the consumer answers after
            your team accepts their brief.
          </p>
        </header>

        <IntakeQuestionsEditor
          ownerKind="team"
          ownerId={teamRow.id}
          initial={questions}
          maxQuestions={MAX_QUESTIONS_PER_OWNER}
        />
      </div>
    </div>
  );
}
