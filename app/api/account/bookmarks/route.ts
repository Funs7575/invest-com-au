import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listBookmarks,
  addBookmark,
  removeBookmark,
  addAnonymousSave,
  type BookmarkType,
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
const VALID_TYPES = new Set<BookmarkType>([
  "article",
  "broker",
  "advisor",
  "scenario",
  "calculator",
]);

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

  const body = await request.json().catch(() => ({}));
  const type = typeof body.type === "string" ? (body.type as BookmarkType) : null;
  const ref = typeof body.ref === "string" ? body.ref.slice(0, 200) : null;
  const label = typeof body.label === "string" ? body.label.slice(0, 200) : null;
  const note = typeof body.note === "string" ? body.note.slice(0, 2000) : null;
  const sessionId =
    typeof body.session_id === "string" ? body.session_id.slice(0, 100) : null;

  if (!type || !VALID_TYPES.has(type) || !ref) {
    return NextResponse.json({ error: "Invalid type or ref" }, { status: 400 });
  }

  const user = await getUser();
  if (user) {
    const ok = await addBookmark({ userId: user.id, type, ref, label, note });
    return NextResponse.json({ ok });
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: "Authenticated user or session_id required" },
      { status: 400 },
    );
  }

  const ok = await addAnonymousSave({ sessionId, type, ref, label });
  if (!ok) log.warn("anonymous save failed", { sessionId, type, ref });
  return NextResponse.json({ ok, anonymous: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const type = typeof body.type === "string" ? (body.type as BookmarkType) : null;
  const ref = typeof body.ref === "string" ? body.ref : null;
  if (!type || !VALID_TYPES.has(type) || !ref) {
    return NextResponse.json({ error: "Invalid type or ref" }, { status: 400 });
  }
  const ok = await removeBookmark({ userId: user.id, type, ref });
  return NextResponse.json({ ok });
}
