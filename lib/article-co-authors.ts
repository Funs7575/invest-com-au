/**
 * Article co-authors — dual attribution on advisor articles.
 *
 * Flow: the article owner invites another professional by email → the
 * invitee sees the invitation in their portal and accepts/declines →
 * accepted rows drive the public dual byline + Person JSON-LD on
 * /expert/[slug].
 *
 * Accepting is always an authenticated portal action by the matching
 * professional — the emailed link only navigates, it never authorises.
 */

// eslint-disable-next-line no-restricted-imports -- cross-row checks (article ownership, invitee professional lookup by email) on behalf of an advisor session; service-role legitimate per CLAUDE.md. Public reads of accepted rows still flow through the table's anon SELECT policy.
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";
import { sendCoAuthorInvitation } from "@/lib/advisor-emails";

const log = logger("article-co-authors");

export interface CoAuthorRow {
  id: number;
  article_id: number;
  professional_id: number;
  invited_by_professional_id: number;
  status: "pending" | "accepted" | "declined" | "revoked";
  responded_at: string | null;
  created_at: string;
}

export interface PublicCoAuthor {
  professional_id: number;
  name: string;
  slug: string;
  photo_url: string | null;
  firm_name: string | null;
}

export type CoAuthorFailure = "unavailable" | "not_found" | "forbidden" | "duplicate" | "error";

function isMissingTableError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205" || err.code === "PGRST200") return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("schema cache");
}

export async function inviteCoAuthor(input: {
  articleId: number;
  invitedByProfessionalId: number;
  coAuthorEmail: string;
}): Promise<{ ok: true; invite: CoAuthorRow } | { ok: false; reason: CoAuthorFailure; message: string }> {
  const admin = createAdminClient();

  // 1. The inviter must own the article, and it must not be rejected.
  const { data: article } = await admin
    .from("advisor_articles")
    .select("id, professional_id, title, status")
    .eq("id", input.articleId)
    .maybeSingle();
  if (!article) return { ok: false, reason: "not_found", message: "Article not found." };
  if (article.professional_id !== input.invitedByProfessionalId) {
    return { ok: false, reason: "forbidden", message: "You can only invite co-authors to your own articles." };
  }
  if (article.status === "rejected") {
    return { ok: false, reason: "forbidden", message: "Rejected articles can't take co-authors." };
  }

  // 2. The invitee must be an existing active professional.
  const { data: invitee } = await admin
    .from("professionals")
    .select("id, name, email, status")
    .ilike("email", input.coAuthorEmail.trim())
    .in("status", ["active", "pending"])
    .maybeSingle();
  if (!invitee) {
    return {
      ok: false,
      reason: "not_found",
      message: "No advisor account found with that email — they need an Invest.com.au profile first.",
    };
  }
  if (invitee.id === input.invitedByProfessionalId) {
    return { ok: false, reason: "duplicate", message: "You're already the author of this article." };
  }

  // 3. Insert the invite.
  const token = randomBytes(32).toString("hex");
  const { data: invite, error } = await admin
    .from("article_co_authors")
    .insert({
      article_id: input.articleId,
      professional_id: invitee.id,
      invited_by_professional_id: input.invitedByProfessionalId,
      status: "pending",
      invite_token: token,
    })
    .select("id, article_id, professional_id, invited_by_professional_id, status, responded_at, created_at")
    .single();

  if (error || !invite) {
    if (isMissingTableError(error)) {
      return { ok: false, reason: "unavailable", message: "Co-authoring is rolling out — try again soon." };
    }
    if (error?.code === "23505") {
      return { ok: false, reason: "duplicate", message: "That advisor has already been invited to this article." };
    }
    log.error("inviteCoAuthor insert failed", { error: error?.message, articleId: input.articleId });
    return { ok: false, reason: "error", message: "Failed to create the invitation." };
  }

  // 4. Notify (never fails the invite).
  try {
    const { data: inviter } = await admin
      .from("professionals")
      .select("name")
      .eq("id", input.invitedByProfessionalId)
      .maybeSingle();
    await sendCoAuthorInvitation(
      invitee.email as string,
      invitee.name as string,
      (inviter?.name as string | undefined) ?? "A fellow advisor",
      article.title as string,
    );
  } catch (err) {
    log.warn("Co-author invite email failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return { ok: true, invite: invite as CoAuthorRow };
}

/** Invitations addressed to this professional (for the portal inbox). */
export async function listInvitesForProfessional(
  professionalId: number,
): Promise<{ id: number; article_id: number; status: string; created_at: string; article_title: string | null; inviter_name: string | null }[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("article_co_authors")
    .select("id, article_id, invited_by_professional_id, status, created_at")
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) {
    if (error && !isMissingTableError(error)) {
      log.error("listInvitesForProfessional failed", { error: error.message });
    }
    return [];
  }

  const rows = data as { id: number; article_id: number; invited_by_professional_id: number; status: string; created_at: string }[];
  const articleIds = Array.from(new Set(rows.map((r) => r.article_id)));
  const inviterIds = Array.from(new Set(rows.map((r) => r.invited_by_professional_id)));

  const [articlesRes, invitersRes] = await Promise.all([
    articleIds.length > 0
      ? admin.from("advisor_articles").select("id, title").in("id", articleIds)
      : Promise.resolve({ data: [] as { id: number; title: string }[] }),
    inviterIds.length > 0
      ? admin.from("professionals").select("id, name").in("id", inviterIds)
      : Promise.resolve({ data: [] as { id: number; name: string }[] }),
  ]);
  const titles = new Map(((articlesRes.data ?? []) as { id: number; title: string }[]).map((a) => [a.id, a.title]));
  const names = new Map(((invitersRes.data ?? []) as { id: number; name: string }[]).map((p) => [p.id, p.name]));

  return rows.map((r) => ({
    id: r.id,
    article_id: r.article_id,
    status: r.status,
    created_at: r.created_at,
    article_title: titles.get(r.article_id) ?? null,
    inviter_name: names.get(r.invited_by_professional_id) ?? null,
  }));
}

export async function respondToInvite(input: {
  inviteId: number;
  professionalId: number;
  accept: boolean;
}): Promise<{ ok: true } | { ok: false; reason: CoAuthorFailure; message: string }> {
  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from("article_co_authors")
    .select("id, professional_id, status")
    .eq("id", input.inviteId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return { ok: false, reason: "unavailable", message: "Co-authoring is rolling out — try again soon." };
    }
    return { ok: false, reason: "error", message: "Failed to load the invitation." };
  }
  if (!invite) return { ok: false, reason: "not_found", message: "Invitation not found." };
  if (invite.professional_id !== input.professionalId) {
    return { ok: false, reason: "forbidden", message: "This invitation is addressed to someone else." };
  }
  if (invite.status !== "pending") {
    return { ok: false, reason: "duplicate", message: "This invitation has already been answered." };
  }

  const { error: updateError } = await admin
    .from("article_co_authors")
    .update({
      status: input.accept ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", input.inviteId)
    .eq("status", "pending");

  if (updateError) {
    log.error("respondToInvite update failed", { error: updateError.message, inviteId: input.inviteId });
    return { ok: false, reason: "error", message: "Failed to record your response." };
  }
  return { ok: true };
}

/**
 * Accepted co-authors with public display data — powers the dual byline.
 * Fail-soft: returns [] until the migration lands.
 */
export async function listAcceptedCoAuthors(articleId: number): Promise<PublicCoAuthor[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("article_co_authors")
    .select("professional_id")
    .eq("article_id", articleId)
    .eq("status", "accepted")
    .limit(4);
  if (error || !data || data.length === 0) {
    if (error && !isMissingTableError(error)) {
      log.error("listAcceptedCoAuthors failed", { error: error.message, articleId });
    }
    return [];
  }

  const ids = (data as { professional_id: number }[]).map((r) => r.professional_id);
  const { data: pros } = await admin
    .from("professionals")
    .select("id, name, slug, photo_url, firm_name")
    .in("id", ids)
    .eq("status", "active");

  return ((pros ?? []) as { id: number; name: string; slug: string; photo_url: string | null; firm_name: string | null }[]).map(
    (p) => ({
      professional_id: p.id,
      name: p.name,
      slug: p.slug,
      photo_url: p.photo_url,
      firm_name: p.firm_name,
    }),
  );
}
