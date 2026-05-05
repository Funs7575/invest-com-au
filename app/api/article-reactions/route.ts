import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getReactionCounts,
  hashIp,
  reactToArticle,
} from "@/lib/article-comments";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

const ReactBody = z.object({
  slug: z.string().min(1),
  reaction: z.enum(["helpful", "like", "confused", "disagree"]),
});

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

  const parsed = ReactBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing slug or reaction" },
      { status: 400 },
    );
  }
  const { slug, reaction } = parsed.data;

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
