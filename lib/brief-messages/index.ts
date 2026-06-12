/**
 * Brief messages — chat thread between the consumer and the accepted
 * professional/team on a marketplace brief (Ship #10 / MM32).
 *
 * A "brief" here means a row in `public.advisor_auctions` with
 * `flow_type='accept'`. Once a brief is accepted (`accepted_at IS NOT NULL`),
 * the tracker page mounts a chat panel; both sides get a single shared
 * thread keyed by `brief_id`.
 *
 * Helpers in this module use the service-role admin client because:
 *   - The consumer side has anonymous (no-JWT) brief paths — the
 *     `advisor_auctions` row is identified by slug + contact_email match,
 *     not by `auth.uid()`. The route handlers do the authorization gate
 *     before calling these helpers (see app/api/briefs/[slug]/messages).
 *   - mark-read flips multiple rows at once — RLS-scoped UPDATEs work
 *     in principle but we prefer the explicit cross-row write path to
 *     match `team-brief-assignments.ts` and friends.
 *
 * Live-updates: the underlying table is added to the `supabase_realtime`
 * publication by 20260515_mm32_brief_messages.sql. Browser subscribes via
 * `supabase.channel('brief-messages-${briefId}')` and appends to local
 * state on each INSERT. Mark-read is fire-and-forget; the count of
 * unread shows up via the read_by_*_at columns on next refresh.
 */

// eslint-disable-next-line no-restricted-imports -- Anonymous consumer briefs have no JWT; cross-row mark-read updates can't be scoped to auth.uid(). Per CLAUDE.md § "Two Supabase clients", anonymous-path helpers + cross-user writes are a legitimate service-role use case.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("brief-messages");

export type BriefMessageSenderKind = "consumer" | "professional" | "team";
export type MarkReadAsKind = "consumer" | "pro";

export const BRIEF_MESSAGE_MAX_BODY_LENGTH = 4000 as const;

export interface BriefMessageRow {
  id: number;
  brief_id: number;
  sender_kind: BriefMessageSenderKind;
  sender_user_id: string | null;
  sender_professional_id: number | null;
  sender_team_id: number | null;
  body: string;
  read_by_consumer_at: string | null;
  read_by_pro_at: string | null;
  created_at: string;
  /**
   * Optional structured payload (booking-v2 "propose times" etc.). NULL for
   * ordinary text messages. Typed loosely here; consumers narrow via the
   * `kind` discriminator (see lib/booking-v2/types ProposeTimesPayload).
   */
  metadata?: Record<string, unknown> | null;
}

export interface SendMessageInput {
  briefId: number;
  senderKind: BriefMessageSenderKind;
  senderUserId?: string | null;
  senderProfessionalId?: number | null;
  senderTeamId?: number | null;
  body: string;
  /** Optional structured payload stored in brief_messages.metadata. */
  metadata?: Record<string, unknown> | null;
}

export interface MarkReadInput {
  briefId: number;
  asKind: MarkReadAsKind;
}

export class BriefMessageError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "BriefMessageError";
  }
}

function normaliseBody(raw: string): string {
  // Trim trailing whitespace; preserve internal newlines for multi-line
  // messages. Empty after trim → 400.
  return raw.replace(/\s+$/g, "");
}

/**
 * List every message on a brief in chronological order (oldest first —
 * the UI scrolls to the bottom so the newest sits at the bottom).
 */
export async function listMessagesForBrief(
  briefId: number,
): Promise<BriefMessageRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("brief_messages")
    .select(
      "id, brief_id, sender_kind, sender_user_id, sender_professional_id, sender_team_id, body, read_by_consumer_at, read_by_pro_at, created_at, metadata",
    )
    .eq("brief_id", briefId)
    .order("created_at", { ascending: true });

  if (error) {
    log.error("listMessagesForBrief failed", {
      briefId,
      error: error.message,
    });
    throw new BriefMessageError("Failed to load messages.", 500);
  }
  return (data ?? []) as BriefMessageRow[];
}

/**
 * Insert a new message. The caller is expected to have already verified
 * the sender's identity against the brief (route handlers do this gate).
 * Returns the inserted row so the client can reconcile its optimistic
 * placeholder.
 */
export async function sendMessage(
  input: SendMessageInput,
): Promise<BriefMessageRow> {
  const body = normaliseBody(input.body);
  if (body.length === 0) {
    throw new BriefMessageError("Message cannot be empty.", 400);
  }
  if (body.length > BRIEF_MESSAGE_MAX_BODY_LENGTH) {
    throw new BriefMessageError(
      `Message cannot exceed ${BRIEF_MESSAGE_MAX_BODY_LENGTH} characters.`,
      400,
    );
  }
  if (input.senderKind === "professional" && !input.senderProfessionalId) {
    throw new BriefMessageError(
      "sender_professional_id is required when sender_kind is 'professional'.",
      400,
    );
  }
  if (input.senderKind === "team" && !input.senderTeamId) {
    throw new BriefMessageError(
      "sender_team_id is required when sender_kind is 'team'.",
      400,
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("brief_messages")
    .insert({
      brief_id: input.briefId,
      sender_kind: input.senderKind,
      sender_user_id: input.senderUserId ?? null,
      sender_professional_id: input.senderProfessionalId ?? null,
      sender_team_id: input.senderTeamId ?? null,
      body,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    })
    .select()
    .single();

  if (error || !data) {
    log.error("sendMessage failed", {
      briefId: input.briefId,
      senderKind: input.senderKind,
      error: error?.message,
    });
    throw new BriefMessageError("Failed to send message.", 500);
  }
  return data as BriefMessageRow;
}

/**
 * Flip the appropriate `read_by_*_at` column on every previously-unread
 * message in this brief. Idempotent — already-read rows are excluded by
 * the `IS NULL` filter so re-calling is a no-op. Returns the count of
 * rows updated.
 */
export async function markRead(input: MarkReadInput): Promise<number> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const column =
    input.asKind === "consumer" ? "read_by_consumer_at" : "read_by_pro_at";

  // Only flip rows that haven't already been marked — keeps the call
  // idempotent and prevents stomping an earlier timestamp on retries.
  const { data, error } = await admin
    .from("brief_messages")
    .update({ [column]: nowIso })
    .eq("brief_id", input.briefId)
    .is(column, null)
    .select("id");

  if (error) {
    log.warn("markRead failed", {
      briefId: input.briefId,
      asKind: input.asKind,
      error: error.message,
    });
    return 0;
  }
  return (data ?? []).length;
}
