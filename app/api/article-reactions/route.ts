import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getReactionCounts,
  hashIp,
  isValidReaction,
  reactToArticle,
  type ReactionKind,
} from "@/lib/article-comments";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

export const runtime = "nodejs";

/**
 * /api/article-reactions
 *
 *   GET  ?slug=…     — counts for an article
 *   POST              — body: { slug, reaction }
 *                       dedup'd per (slug, user_id or ip_hash, reaction)
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }
  const counts = await getReactionCounts(slug);
  return NextResponse.json({ counts });
}

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("article_reaction", ipKey(request), {
      max: 20,
      refillPerSec: 20 / 60,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug : null;
  const reaction = body.reaction as ReactionKind;
  if (!slug || !isValidReaction(reaction)) {
    return NextResponse.json(
      { error: "Missing slug or reaction" },
      { status: 400 },
    );
  }

  // Prefer authenticated user id so the dedup is permanent. Anonymous
  // visitors dedup by IP hash (salted server-side).
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {
    /* anonymous */
  }
  const ipHash = userId ? null : hashIp(ipKey(request) || "unknown");

  const ok = await reactToArticle({
    articleSlug: slug,
    reaction,
    userId,
    ipHash,
  });

  if (!ok) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  const counts = await getReactionCounts(slug);
  return NextResponse.json({ ok: true, counts });
}
