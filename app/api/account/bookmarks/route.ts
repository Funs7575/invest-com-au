import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  listBookmarks,
  addBookmark,
  removeBookmark,
  addAnonymousSave,
} from "@/lib/bookmarks";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:account:bookmarks");

export const runtime = "nodejs";

/**
 * /api/account/bookmarks
 *
 *   GET    — authenticated user's bookmark list
 *   POST   — add a bookmark; works for anonymous users too
 *            (writes to anonymous_saves when no session user)
 *   DELETE — remove a bookmark (authenticated only)
 */
const BOOKMARK_TYPES = ["article", "broker", "advisor", "scenario", "calculator"] as const;

const AddBookmarkBody = z.object({
  type: z.enum(BOOKMARK_TYPES),
  ref: z.string().min(1).max(200),
  label: z.string().max(200).nullish(),
  note: z.string().max(2000).nullish(),
  session_id: z.string().max(100).nullish(),
});

const RemoveBookmarkBody = z.object({
  type: z.enum(BOOKMARK_TYPES),
  ref: z.string().min(1),
});

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listBookmarks(user.id);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  // Rate limit — prevents a scripted save-loop
  if (
    !(await isAllowed("bookmarks_write", ipKey(request), {
      max: 30,
      refillPerSec: 30 / 60,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = AddBookmarkBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid type or ref" }, { status: 400 });
  }
  const { type, ref, label = null, note = null, session_id: sessionId = null } = parsed.data;

  const user = await getUser();
  if (user) {
    const ok = await addBookmark({ userId: user.id, type, ref, label: label ?? null, note: note ?? null });
    return NextResponse.json({ ok });
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: "Authenticated user or session_id required" },
      { status: 400 },
    );
  }

  const ok = await addAnonymousSave({ sessionId, type, ref, label: label ?? null });
  if (!ok) log.warn("anonymous save failed", { sessionId, type, ref });
  return NextResponse.json({ ok, anonymous: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = RemoveBookmarkBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid type or ref" }, { status: 400 });
  }
  const { type, ref } = parsed.data;
  const ok = await removeBookmark({ userId: user.id, type, ref });
  return NextResponse.json({ ok });
}
