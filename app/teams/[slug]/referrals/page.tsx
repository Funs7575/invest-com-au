import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

// eslint-disable-next-line no-restricted-imports -- referrals join across teams; service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  listIncomingForTeam,
  listOutgoingForTeam,
  type TeamBriefReferral,
} from "@/lib/team-brief-referrals";
import ReferralActions from "./_components/ReferralActions";

export const metadata: Metadata = {
  title: "Squad referrals",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeamReferralsPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/advisor-portal/login?next=/teams/${encodeURIComponent(slug)}/referrals`);
  }

  const admin = createAdminClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("id, slug, name, verification_status")
    .eq("slug", slug)
    .maybeSingle();
  if (!team) notFound();

  // Confirm caller is an active member of this team. Anything else =>
  // 404 (don't leak the page's existence to non-members).
  const { data: pro } = await admin
    .from("professionals")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!pro) notFound();
  const { data: membership } = await admin
    .from("expert_team_members")
    .select("status")
    .eq("team_id", team.id as number)
    .eq("professional_id", pro.id as number)
    .maybeSingle();
  if (!membership || membership.status !== "active") notFound();

  const [incoming, outgoing] = await Promise.all([
    listIncomingForTeam(team.id as number),
    listOutgoingForTeam(team.id as number),
  ]);

  // Resolve referenced team names + brief titles for a friendlier display.
  const otherTeamIds = Array.from(
    new Set(
      [
        ...incoming.map((r) => r.from_team_id),
        ...outgoing.map((r) => r.to_team_id),
      ].filter((id) => id !== team.id),
    ),
  );
  const briefIds = Array.from(
    new Set([...incoming, ...outgoing].map((r) => r.brief_id)),
  );

  const otherTeamsById = new Map<number, { name: string; slug: string }>();
  if (otherTeamIds.length > 0) {
    const { data: rows } = await admin
      .from("expert_teams")
      .select("id, name, slug")
      .in("id", otherTeamIds);
    for (const r of (rows ?? []) as { id: number; name: string; slug: string }[]) {
      otherTeamsById.set(r.id, { name: r.name, slug: r.slug });
    }
  }

  const briefsById = new Map<number, { title: string | null; slug: string | null }>();
  if (briefIds.length > 0) {
    const { data: rows } = await admin
      .from("advisor_auctions")
      .select("id, brief_template, slug, brief_payload")
      .in("id", briefIds);
    for (const r of (rows ?? []) as {
      id: number;
      brief_template: string | null;
      slug: string | null;
      brief_payload: Record<string, unknown> | null;
    }[]) {
      const title =
        (r.brief_payload?.title as string | undefined) ??
        r.brief_template ??
        null;
      briefsById.set(r.id, { title, slug: r.slug ?? null });
    }
  }

  function renderRow(
    referral: TeamBriefReferral,
    direction: "incoming" | "outgoing",
  ) {
    const otherTeamId =
      direction === "incoming" ? referral.from_team_id : referral.to_team_id;
    const otherTeam = otherTeamsById.get(otherTeamId);
    const brief = briefsById.get(referral.brief_id);
    const created = new Date(referral.created_at).toLocaleString();

    return (
      <li
        key={referral.id}
        style={{
          padding: "14px 16px",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          marginBottom: 10,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: "#0f172a" }}>
              {brief?.title ?? `Brief #${referral.brief_id}`}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#475569" }}>
              {direction === "incoming" ? "From" : "To"}:{" "}
              <strong>{otherTeam?.name ?? `Team #${otherTeamId}`}</strong>
            </p>
            {referral.note ? (
              <p
                style={{
                  margin: "8px 0 0 0",
                  fontSize: 13,
                  color: "#0f172a",
                  background: "#f1f5f9",
                  padding: "8px 10px",
                  borderRadius: 6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {referral.note}
              </p>
            ) : null}
            <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#94a3b8" }}>
              {created}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <StatusBadge status={referral.status} />
            {direction === "incoming" && referral.status === "pending" ? (
              <div style={{ marginTop: 10 }}>
                <ReferralActions referralId={referral.id} />
              </div>
            ) : null}
          </div>
        </div>
      </li>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <p style={{ fontSize: 13 }}>
        <Link href={`/teams/${slug}`} style={{ color: "#0ea5e9" }}>
          ← {team.name as string}
        </Link>
      </p>
      <h1 style={{ fontSize: 22, marginTop: 8, color: "#0f172a" }}>
        Squad referrals
      </h1>
      <p style={{ color: "#475569", fontSize: 14 }}>
        Cross-team referrals. Accept an incoming referral to claim the brief
        for your squad; decline if it&apos;s not a fit.
      </p>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 16, color: "#0f172a" }}>
          Incoming ({incoming.length})
        </h2>
        {incoming.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            No incoming referrals yet.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {incoming.map((r) => renderRow(r, "incoming"))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16, color: "#0f172a" }}>
          Outgoing ({outgoing.length})
        </h2>
        {outgoing.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            You haven&apos;t referred any briefs out yet.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {outgoing.map((r) => renderRow(r, "outgoing"))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, { bg: string; fg: string }> = {
    pending: { bg: "#fef3c7", fg: "#92400e" },
    accepted: { bg: "#dcfce7", fg: "#166534" },
    declined: { bg: "#fee2e2", fg: "#991b1b" },
    expired: { bg: "#e2e8f0", fg: "#475569" },
  };
  const colors = palette[status] ?? palette["pending"]!;
  return (
    <span
      style={{
        display: "inline-block",
        background: colors.bg,
        color: colors.fg,
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}
