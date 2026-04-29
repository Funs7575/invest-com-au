import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("quotes:qa");

const PostQASchema = z.object({
  body: z.string().min(4, "Answer must be at least 4 characters.").max(2000, "Answer too long."),
  is_question: z.boolean().optional().default(false),
  parent_id: z.number().int().positive().optional(),
  // Consumer (owner) auth: must match auction.contact_email.
  contact_email: z.string().email().optional(),
  display_name: z.string().min(1).max(80).optional(),
});

interface QARow {
  id: number;
  auction_id: number;
  advisor_id: number | null;
  author_display_name: string;
  body: string;
  is_question: boolean;
  parent_id: number | null;
  created_at: string;
  professionals: { slug: string; type: string; verified: boolean } | null;
}

/**
 * GET /api/quotes/[slug]/qa — public read of all (non-removed) Q&A on a job.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`qa-get:${ip}`, 60, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { slug } = await ctx.params;
    const admin = createAdminClient();

    const { data: auction } = await admin
      .from("advisor_auctions")
      .select("id")
      .eq("slug", slug)
      .eq("source", "public_job")
      .eq("is_public", true)
      .maybeSingle();

    if (!auction) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    const { data: qa } = await admin
      .from("quote_qa")
      .select(`
        id, auction_id, advisor_id, author_display_name, body,
        is_question, parent_id, created_at,
        professionals:advisor_id ( slug, type, verified )
      `)
      .eq("auction_id", auction.id)
      .eq("is_removed", false)
      .order("created_at", { ascending: true });

    return NextResponse.json({ qa: (qa ?? []) as unknown as QARow[] });
  } catch (err) {
    log.error("Q&A GET error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load Q&A." }, { status: 500 });
  }
}

/**
 * POST /api/quotes/[slug]/qa — Either:
 *   - Authenticated advisor (Supabase user → professionals row), OR
 *   - The job owner (matches auction.contact_email).
 *
 * Anonymous strangers cannot post.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`qa-post:${ip}`, 10, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { slug } = await ctx.params;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = PostQASchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body." }, { status: 400 });
    }
    const body = parsed.data;

    const admin = createAdminClient();

    const { data: auction } = await admin
      .from("advisor_auctions")
      .select("id, contact_email, contact_name")
      .eq("slug", slug)
      .eq("source", "public_job")
      .eq("is_public", true)
      .maybeSingle();
    if (!auction) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    // Try advisor auth first
    let advisorId: number | null = null;
    let displayName: string | null = null;
    let authorEmail: string | null = null;

    const supa = await createClient();
    const { data: { user } } = await supa.auth.getUser();
    if (user?.email) {
      const { data: pro } = await admin
        .from("professionals")
        .select("id, name")
        .eq("email", user.email)
        .eq("status", "active")
        .maybeSingle();
      if (pro) {
        advisorId = pro.id as number;
        displayName = (pro.name as string) || "Advisor";
        authorEmail = user.email;
      }
    }

    // Or fall back to owner auth
    if (!advisorId) {
      if (
        !body.contact_email ||
        body.contact_email.toLowerCase().trim() !==
          (auction.contact_email as string)?.toLowerCase()
      ) {
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      }
      displayName = body.display_name?.trim() || (auction.contact_name as string) || "Job Owner";
      authorEmail = body.contact_email.toLowerCase().trim();
    }

    const { data: inserted, error: insErr } = await admin
      .from("quote_qa")
      .insert({
        auction_id: auction.id,
        advisor_id: advisorId,
        author_email: authorEmail,
        author_display_name: displayName,
        body: body.body.trim(),
        is_question: body.is_question ?? false,
        parent_id: body.parent_id ?? null,
      })
      .select("id")
      .single();

    if (insErr) {
      log.error("Failed to insert Q&A", { err: insErr.message });
      return NextResponse.json({ error: "Failed to post." }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: inserted.id });
  } catch (err) {
    log.error("Q&A POST error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to post." }, { status: 500 });
  }
}
