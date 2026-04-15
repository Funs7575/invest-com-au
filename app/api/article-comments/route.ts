import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listPublishedComments,
  submitComment,
} from "@/lib/article-comments";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";

const log = logger("api:article-comments");

export const runtime = "nodejs";

/**
 * /api/article-comments
 *
 *   GET  ?slug=…   — list published comments for an article
 *   POST          — submit a comment. Body:
 *                   { slug, name, email, body, parent_id? }
 *                   Auth optional — anonymous comments are allowed,
 *                   but a valid email is always required.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }
  const items = await listPublishedComments(slug);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  // 5 comments / 10 min per IP — enough for a legit reply-back-and-forth
  // but kills bot floods before they hit the classifier.
  if (
    !(await isAllowed("article_comment", ipKey(request), {
      max: 5,
      refillPerSec: 5 / 600,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug : null;
  const name = typeof body.name === "string" ? body.name.trim() : null;
  const email = typeof body.email === "string" ? body.email.trim() : null;
  const text = typeof body.body === "string" ? body.body : null;
  const parentId = typeof body.parent_id === "number" ? body.parent_id : null;

  if (!slug || !name || !email || !text) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // If the user is authed, prefer their auth identity for author_id + email.
  let authorId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) authorId = user.id;
  } catch {
    /* anonymous is fine */
  }

  const result = await submitComment({
    articleSlug: slug,
    authorId,
    authorName: name,
    authorEmail: email,
    body: text,
    parentId,
  });

  if (!result.ok) {
    log.info("comment rejected", { reason: result.reason });
    return NextResponse.json(
      { error: result.reason || "invalid" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: result.status,
    pending: result.status !== "published",
  });
}
