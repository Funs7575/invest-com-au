/**
 * DELETE /api/briefs/[slug]/shortlist/[id] — remove a pinned provider.
 * PATCH  /api/briefs/[slug]/shortlist/[id] — update the consumer's note.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import {
  ShortlistError,
  removeFromShortlist,
  updateNote,
} from "@/lib/brief-shortlist";

const PatchBody = z.object({
  note: z.string().max(1000).nullable(),
});

async function requireOwnerEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string; id: string }> },
) {
  if (
    !(await isAllowed("brief_shortlist_remove", ipKey(request), {
      max: 60,
      refillPerSec: 1,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { id } = await ctx.params;
  const email = await requireOwnerEmail();
  if (!email) return NextResponse.json({ error: "Auth." }, { status: 401 });

  try {
    await removeFromShortlist(Number.parseInt(id, 10), email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ShortlistError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === "not_found" ? 404 : 403 },
      );
    }
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string; id: string }> },
) {
  if (
    !(await isAllowed("brief_shortlist_note", ipKey(request), {
      max: 30,
      refillPerSec: 0.5,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { id } = await ctx.params;
  const email = await requireOwnerEmail();
  if (!email) return NextResponse.json({ error: "Auth." }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  try {
    await updateNote({
      shortlistId: Number.parseInt(id, 10),
      note: parsed.data.note,
      ownerEmail: email,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ShortlistError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === "not_found" ? 404 : 403 },
      );
    }
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
