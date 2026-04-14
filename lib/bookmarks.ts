/**
 * User bookmark helpers.
 *
 * `user_bookmarks` is a simple per-user save list. Rows are
 * typed by `bookmark_type` so the same UI can render saved
 * articles / brokers / advisors / scenarios / calculators.
 *
 * The pre-auth flow lives on `anonymous_saves`:
 *   1. A not-yet-signed-up visitor clicks "save" on a broker.
 *   2. We write an anonymous_saves row keyed to the session id.
 *   3. On signup we call `claimAnonymousSaves(sessionId, userId)`
 *      which replays every row into user_bookmarks and stamps
 *      claimed_at on the anonymous row.
 *
 * All functions are async + never throw — DB failures return an
 * empty result so the bookmark star never breaks the page.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("bookmarks");

export type BookmarkType =
  | "article"
  | "broker"
  | "advisor"
  | "scenario"
  | "calculator";

export interface BookmarkRow {
  id: number;
  user_id: string;
  bookmark_type: BookmarkType;
  ref: string;
  label: string | null;
  note: string | null;
  created_at: string;
}

export async function listBookmarks(userId: string): Promise<BookmarkRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("user_bookmarks")
      .select("id, user_id, bookmark_type, ref, label, note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return (data as BookmarkRow[] | null) || [];
  } catch (err) {
    log.warn("listBookmarks threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

export async function addBookmark(input: {
  userId: string;
  type: BookmarkType;
  ref: string;
  label?: string | null;
  note?: string | null;
}): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("user_bookmarks").upsert(
      {
        user_id: input.userId,
        bookmark_type: input.type,
        ref: input.ref,
        label: input.label ?? null,
        note: input.note ?? null,
      },
      { onConflict: "user_id,bookmark_type,ref" },
    );
    if (error) {
      log.warn("user_bookmarks upsert failed", { error: error.message });
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function removeBookmark(input: {
  userId: string;
  type: BookmarkType;
  ref: string;
}): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("user_bookmarks")
      .delete()
      .eq("user_id", input.userId)
      .eq("bookmark_type", input.type)
      .eq("ref", input.ref);
    return true;
  } catch {
    return false;
  }
}

// ─── Anonymous saves + claim-on-signup ────────────────────────────

export async function addAnonymousSave(input: {
  sessionId: string;
  type: BookmarkType;
  ref: string;
  label?: string | null;
}): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("anonymous_saves").upsert(
      {
        session_id: input.sessionId,
        bookmark_type: input.type,
        ref: input.ref,
        label: input.label ?? null,
      },
      { onConflict: "session_id,bookmark_type,ref" },
    );
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

export async function listAnonymousSaves(
  sessionId: string,
): Promise<Array<Pick<BookmarkRow, "bookmark_type" | "ref" | "label" | "created_at">>> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("anonymous_saves")
      .select("bookmark_type, ref, label, created_at")
      .eq("session_id", sessionId)
      .is("claimed_at", null);
    return (data as Array<Pick<BookmarkRow, "bookmark_type" | "ref" | "label" | "created_at">> | null) || [];
  } catch {
    return [];
  }
}

/**
 * Replay every unclaimed anonymous save into user_bookmarks and
 * stamp claimed_at on the source rows. Idempotent — re-running
 * is a no-op because upsert on user_bookmarks handles duplicates.
 *
 * Called from the signup / sign-in flow the first time we see a
 * user_id attached to a session that previously had anonymous
 * saves.
 */
export async function claimAnonymousSaves(
  sessionId: string,
  userId: string,
): Promise<number> {
  try {
    const pending = await listAnonymousSaves(sessionId);
    if (pending.length === 0) return 0;

    const supabase = createAdminClient();

    // Upsert each row into user_bookmarks — pure data move.
    const rows = pending.map((r) => ({
      user_id: userId,
      bookmark_type: r.bookmark_type,
      ref: r.ref,
      label: r.label,
    }));
    const { error: upErr } = await supabase
      .from("user_bookmarks")
      .upsert(rows, { onConflict: "user_id,bookmark_type,ref" });
    if (upErr) {
      log.warn("claim user_bookmarks upsert failed", { error: upErr.message });
      return 0;
    }

    // Mark the source rows claimed
    await supabase
      .from("anonymous_saves")
      .update({
        claimed_at: new Date().toISOString(),
        claimed_by_user_id: userId,
      })
      .eq("session_id", sessionId)
      .is("claimed_at", null);

    log.info("Claimed anonymous saves", { userId, count: pending.length });
    return pending.length;
  } catch (err) {
    log.warn("claimAnonymousSaves threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}
