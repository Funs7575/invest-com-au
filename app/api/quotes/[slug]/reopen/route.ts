import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("quotes:reopen");

const REOPEN_LIMIT = 2; // max times a single job may be re-opened
const REOPEN_DAYS = 7;

const ReopenRequest = z.object({
  contact_email: z.string().email("A valid email is required."),
});

/**
 * POST /api/quotes/[slug]/reopen — Consumer extends a closed/expired job
 * for another 7 days. Owner verifies by email. Capped at REOPEN_LIMIT
 * re-opens per job to prevent abuse.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`quote-reopen:${ip}`, 5, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { slug } = await ctx.params;
    if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = ReopenRequest.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: auction } = await admin
      .from("advisor_auctions")
      .select("id, slug, status, contact_email, ends_at, reopened_count, winning_bid_id")
      .eq("slug", slug)
      .eq("source", "public_job")
      .eq("is_public", true)
      .maybeSingle();

    if (!auction) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    if ((auction.contact_email as string)?.toLowerCase() !== parsed.data.contact_email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Verification failed." }, { status: 403 });
    }

    if (auction.winning_bid_id) {
      return NextResponse.json({ error: "Cannot re-open a job with an accepted quote." }, { status: 400 });
    }

    const reopened = (auction.reopened_count as number) ?? 0;
    if (reopened >= REOPEN_LIMIT) {
      return NextResponse.json({ error: `This job has reached the re-open limit (${REOPEN_LIMIT}).` }, { status: 400 });
    }

    const newEnds = new Date(Date.now() + REOPEN_DAYS * 86400_000).toISOString();

    const { error: updErr } = await admin
      .from("advisor_auctions")
      .update({
        status: "open",
        ends_at: newEnds,
        reopened_count: reopened + 1,
        expiry_reminder_sent_at: null,
      })
      .eq("id", auction.id);

    if (updErr) {
      log.error("Failed to reopen auction", { id: auction.id, err: updErr.message });
      return NextResponse.json({ error: "Failed to re-open." }, { status: 500 });
    }

    log.info("Public job re-opened", { id: auction.id, slug, count: reopened + 1 });
    return NextResponse.json({ success: true, ends_at: newEnds, reopened_count: reopened + 1 });
  } catch (err) {
    log.error("Reopen error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to re-open." }, { status: 500 });
  }
}
