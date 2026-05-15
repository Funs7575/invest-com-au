import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  bookSlot,
  ConsultationError,
  getSlot,
} from "@/lib/consultations";
import {
  sendProConsultationBooked,
  sendConsumerConsultationPending,
} from "@/lib/marketplace-emails";

const log = logger("consultations:book-slot");

const Body = z.object({
  slot_id: z.number().int().positive(),
  notes: z.string().max(2000).optional(),
  // Optional — when present we treat it as an email-as-key check
  // (mirrors /api/briefs/[slug]/withdraw). The signed-in path uses
  // the JWT instead.
  contact_email: z.string().email().max(200).optional(),
});

/**
 * POST /api/briefs/[slug]/book-slot — Consumer books a consultation slot.
 *
 * Auth: caller must be the brief owner. We resolve identity either from:
 *   1. The signed-in Supabase user (matching contact_email), or
 *   2. The `contact_email` body field matching the brief's contact_email
 *      (mirrors the existing email-as-key pattern from /withdraw).
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (
      !(await isAllowed("briefs_book_slot", ipKey(request), {
        max: 20,
        refillPerSec: 0.3,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { slug } = await ctx.params;
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = Body.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: brief } = await admin
      .from("advisor_auctions")
      .select(
        "id, slug, job_title, contact_email, contact_name, accepted_by_professional_id, accepted_by_team_id",
      )
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();

    if (!brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }

    const briefRow = brief as {
      id: number;
      slug: string;
      job_title: string;
      contact_email: string | null;
      contact_name: string | null;
      accepted_by_professional_id: number | null;
      accepted_by_team_id: number | null;
    };

    if (!briefRow.accepted_by_professional_id) {
      return NextResponse.json(
        { error: "Brief has not been accepted yet." },
        { status: 400 },
      );
    }

    // Resolve consumer identity.
    let consumerEmail: string | null = null;
    let consumerUserId: string | null = null;

    if (parsed.data.contact_email) {
      const provided = parsed.data.contact_email.toLowerCase().trim();
      const expected = (briefRow.contact_email ?? "").toLowerCase().trim();
      if (!expected || expected !== provided) {
        return NextResponse.json(
          { error: "Email does not match brief owner." },
          { status: 403 },
        );
      }
      consumerEmail = provided;
    } else {
      // Try signed-in route.
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !user.email) {
        return NextResponse.json(
          { error: "Sign in or provide contact_email." },
          { status: 401 },
        );
      }
      if (
        (briefRow.contact_email ?? "").toLowerCase() !==
        user.email.toLowerCase()
      ) {
        return NextResponse.json(
          { error: "You do not own this brief." },
          { status: 403 },
        );
      }
      consumerEmail = user.email.toLowerCase();
      consumerUserId = user.id;
    }

    // Verify the slot belongs to the accepting pro (no cross-pro booking).
    const slot = await getSlot(parsed.data.slot_id);
    if (!slot) {
      return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    }
    if (slot.professional_id !== briefRow.accepted_by_professional_id) {
      return NextResponse.json(
        { error: "Slot does not belong to the accepting pro." },
        { status: 400 },
      );
    }

    const result = await bookSlot({
      slotId: parsed.data.slot_id,
      briefId: briefRow.id,
      consumerEmail,
      consumerUserId,
      consumerNotes: parsed.data.notes ?? null,
    });

    log.info("consultation booked", {
      bookingId: result.booking.id,
      slotId: result.slot.id,
      briefId: briefRow.id,
    });

    // ── Best-effort email notifications ──
    void (async () => {
      try {
        const { data: pro } = await admin
          .from("professionals")
          .select("name, email")
          .eq("id", briefRow.accepted_by_professional_id)
          .maybeSingle();
        if (pro?.email) {
          await sendProConsultationBooked({
            providerEmail: pro.email as string,
            providerName: (pro.name as string) ?? "there",
            consumerName: briefRow.contact_name ?? "",
            consumerEmail: consumerEmail!,
            briefTitle: briefRow.job_title,
            briefSlug: briefRow.slug,
            startAt: result.slot.start_at,
            endAt: result.slot.end_at,
            notes: parsed.data.notes ?? null,
          });
        }
        await sendConsumerConsultationPending({
          consumerEmail: consumerEmail!,
          consumerName: briefRow.contact_name ?? "",
          providerName: (pro?.name as string) ?? "Your pro",
          briefTitle: briefRow.job_title,
          briefSlug: briefRow.slug,
          startAt: result.slot.start_at,
          endAt: result.slot.end_at,
        });
      } catch (err) {
        log.warn("booking notification email failed", {
          bookingId: result.booking.id,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return NextResponse.json({
      success: true,
      booking: result.booking,
      slot: result.slot,
    });
  } catch (err) {
    if (err instanceof ConsultationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    log.error("book-slot error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to book consultation." },
      { status: 500 },
    );
  }
}
