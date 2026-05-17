/**
 * Brief comparison shortlist — consumer pins up to 5 accepted providers on
 * their tracker page for side-by-side comparison. Cuts decision time and
 * increases brief→engagement conversion.
 */
// eslint-disable-next-line no-restricted-imports -- the consumer's auth.email() may not match a clean RLS predicate when they originally posted the brief anonymously; service-role with explicit ownership check covers both signed-in and email-keyed flows.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("brief-shortlist");

export const SHORTLIST_MAX = 5;

export type ProviderKind = "professional" | "team";

export interface ShortlistRow {
  id: number;
  brief_id: number;
  provider_kind: ProviderKind;
  provider_id: number;
  added_by_user_id: string | null;
  added_by_email: string;
  note: string | null;
  created_at: string;
}

export class ShortlistError extends Error {
  constructor(
    public code:
      | "limit_reached"
      | "duplicate"
      | "not_owner"
      | "not_found"
      | "insert_failed",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ShortlistError";
  }
}

export async function getShortlistForBrief(
  briefId: number,
): Promise<ShortlistRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("brief_shortlists")
    .select("*")
    .eq("brief_id", briefId)
    .order("created_at", { ascending: true });
  if (error) {
    log.warn("getShortlistForBrief failed", { briefId, err: error.message });
    return [];
  }
  return (data ?? []) as ShortlistRow[];
}

export async function addToShortlist(input: {
  briefId: number;
  providerKind: ProviderKind;
  providerId: number;
  addedByEmail: string;
  addedByUserId?: string | null;
  note?: string | null;
}): Promise<ShortlistRow> {
  const admin = createAdminClient();

  // Count-before-insert enforcement of the 5-max.
  const { count } = await admin
    .from("brief_shortlists")
    .select("id", { count: "exact", head: true })
    .eq("brief_id", input.briefId);
  if ((count ?? 0) >= SHORTLIST_MAX) {
    throw new ShortlistError("limit_reached");
  }

  const { data, error } = await admin
    .from("brief_shortlists")
    .insert({
      brief_id: input.briefId,
      provider_kind: input.providerKind,
      provider_id: input.providerId,
      added_by_email: input.addedByEmail,
      added_by_user_id: input.addedByUserId ?? null,
      note: input.note ?? null,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new ShortlistError("duplicate");
    throw new ShortlistError("insert_failed", error.message);
  }
  if (!data) throw new ShortlistError("insert_failed", "no row");
  return data as ShortlistRow;
}

export async function removeFromShortlist(
  shortlistId: number,
  ownerEmail: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("brief_shortlists")
    .select("id, added_by_email")
    .eq("id", shortlistId)
    .maybeSingle();
  if (!row) throw new ShortlistError("not_found");
  if (row.added_by_email !== ownerEmail) throw new ShortlistError("not_owner");
  await admin.from("brief_shortlists").delete().eq("id", shortlistId);
}

export async function updateNote(input: {
  shortlistId: number;
  note: string | null;
  ownerEmail: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("brief_shortlists")
    .select("id, added_by_email")
    .eq("id", input.shortlistId)
    .maybeSingle();
  if (!row) throw new ShortlistError("not_found");
  if (row.added_by_email !== input.ownerEmail) {
    throw new ShortlistError("not_owner");
  }
  await admin
    .from("brief_shortlists")
    .update({ note: input.note?.slice(0, 1000) ?? null })
    .eq("id", input.shortlistId);
}
