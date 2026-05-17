/**
 * Squad lead-magnet — shareable per-(squad × topic) landing pages.
 *
 * Each verified squad gets a polished single-purpose URL per intent topic
 * they specialise in. Squads share the link on LinkedIn / in email
 * signatures and visitors land on a tightly-scoped CTA into Get Matched
 * pre-stamped with the squad + topic.
 */
// eslint-disable-next-line no-restricted-imports -- public ISR page reads verified squads + outcome aggregates without an authenticated session.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getIntent, getEnabledIntents } from "@/lib/getmatched/intents";

const log = logger("squad-lead-magnet");

export interface SquadTopicData {
  team: {
    id: number;
    slug: string;
    name: string;
    verification_status: string;
    member_count: number;
  };
  topic: { slug: string; label: string; description: string | null };
  members: Array<{ id: number; name: string }>;
  testimonials: Array<{ rating: number | null; testimonial: string; submitted_at: string }>;
  outcomeScore: number | null;
}

export async function getSquadTopicData(
  teamSlug: string,
  topicSlug: string,
): Promise<SquadTopicData | null> {
  try {
    const admin = createAdminClient();
    const [teamRes, intent] = await Promise.all([
      admin
        .from("expert_teams")
        .select("id, slug, name, verification_status, specialty_slugs")
        .eq("slug", teamSlug)
        .maybeSingle(),
      getIntent(topicSlug),
    ]);
    if (!teamRes.data || !intent) return null;
    const team = teamRes.data as {
      id: number;
      slug: string;
      name: string;
      verification_status: string;
      specialty_slugs: string[] | null;
    };
    if (team.verification_status !== "verified") return null;
    if (
      team.specialty_slugs &&
      team.specialty_slugs.length > 0 &&
      !team.specialty_slugs.includes(topicSlug)
    ) {
      return null;
    }

    const [{ data: members }, { data: testimonialsRaw }, { data: scoreRow }] =
      await Promise.all([
        admin
          .from("expert_team_members")
          .select("professional_id, professionals!inner(id, name)")
          .eq("team_id", team.id)
          .eq("status", "active")
          .limit(5),
        admin
          .from("brief_outcomes")
          .select("rating, testimonial, submitted_at, outcome, show_testimonial")
          .eq("team_id", team.id)
          .eq("outcome", "completed")
          .eq("show_testimonial", true)
          .not("testimonial", "is", null)
          .order("submitted_at", { ascending: false })
          .limit(2),
        admin
          .from("provider_outcome_scores")
          .select("score")
          .eq("team_id", team.id)
          .maybeSingle(),
      ]);

    const memberList = (members ?? []).flatMap((m) => {
      const row = m as { professionals: unknown };
      const arr = Array.isArray(row.professionals)
        ? (row.professionals as Array<{ id: number; name: string }>)
        : row.professionals
          ? [row.professionals as { id: number; name: string }]
          : [];
      return arr.filter((p) => typeof p?.id === "number");
    });

    return {
      team: {
        id: team.id,
        slug: team.slug,
        name: team.name,
        verification_status: team.verification_status,
        member_count: memberList.length,
      },
      topic: {
        slug: intent.slug,
        label: intent.label,
        description: intent.description ?? null,
      },
      members: memberList,
      testimonials: ((testimonialsRaw ?? []) as Array<{
        rating: number | null;
        testimonial: string | null;
        submitted_at: string;
      }>).filter((t) => typeof t.testimonial === "string" && t.testimonial.length > 0)
        .map((t) => ({
          rating: t.rating,
          testimonial: t.testimonial as string,
          submitted_at: t.submitted_at,
        })),
      outcomeScore: (scoreRow?.score as number | null) ?? null,
    };
  } catch (err) {
    log.warn("getSquadTopicData failed", {
      teamSlug,
      topicSlug,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export interface LeadMagnetCombo {
  team_slug: string;
  topic_slug: string;
}

const COMBO_CAP = 500;

export async function generateAllCombos(): Promise<LeadMagnetCombo[]> {
  try {
    const admin = createAdminClient();
    const [{ data: teams }, intents] = await Promise.all([
      admin
        .from("expert_teams")
        .select("slug, specialty_slugs, created_at")
        .eq("verification_status", "verified")
        .order("created_at", { ascending: false })
        .limit(200),
      getEnabledIntents(),
    ]);
    const enabledSlugs = new Set<string>(intents.map((i) => i.slug as string));
    const out: LeadMagnetCombo[] = [];
    for (const t of (teams ?? []) as Array<{
      slug: string;
      specialty_slugs: string[] | null;
    }>) {
      const topics =
        t.specialty_slugs && t.specialty_slugs.length > 0
          ? t.specialty_slugs.filter((s) => enabledSlugs.has(s)).slice(0, 3)
          : intents.slice(0, 3).map((i) => i.slug);
      for (const topic of topics) {
        out.push({ team_slug: t.slug, topic_slug: topic });
        if (out.length >= COMBO_CAP) return out;
      }
    }
    return out;
  } catch (err) {
    log.warn("generateAllCombos failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

export async function listTeamLeadMagnetUrls(
  teamSlug: string,
): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const [{ data: team }, intents] = await Promise.all([
      admin
        .from("expert_teams")
        .select("specialty_slugs")
        .eq("slug", teamSlug)
        .maybeSingle(),
      getEnabledIntents(),
    ]);
    const teamRow = team as { specialty_slugs: string[] | null } | null;
    const enabledSlugs = new Set<string>(intents.map((i) => i.slug as string));
    const topics =
      teamRow?.specialty_slugs && teamRow.specialty_slugs.length > 0
        ? teamRow.specialty_slugs.filter((s) => enabledSlugs.has(s))
        : intents.slice(0, 5).map((i) => i.slug);
    return topics.map((t) => `/teams/${teamSlug}/topic/${t}`);
  } catch {
    return [];
  }
}
