/**
 * In-app consultation booking helpers (MM33 / Ship #5).
 *
 * v1 is intentionally minimal — no external calendar OAuth. The pro
 * publishes open availability slots; the consumer (whose brief has just
 * been accepted) picks one from the brief tracker page. The pro
 * eventually pastes a Google Meet / Zoom URL on confirmation.
 *
 * Schema lives in `supabase/migrations/20260515_mm33_consultations.sql`.
 *
 * All mutating helpers go through the service-role admin client because:
 *   - bookSlot needs an atomic open→booked transition the anon role
 *     can't guarantee under RLS (no SELECT ... FOR UPDATE on the wire);
 *   - cancelBooking touches two tables on behalf of either party;
 *   - confirmBooking writes the pro's meet URL plus a status change.
 * The corresponding API routes still enforce caller authorisation up
 * front (pro session or brief-email match) — these helpers assume the
 * caller already verified that the action is permitted.
 */

// eslint-disable-next-line no-restricted-imports -- service-role legitimate per CLAUDE.md: bookSlot performs an atomic open->booked compare-and-set across two tables (pro_availability_slots + consultation_bookings); cancelBooking and confirmBooking similarly span both tables. The API routes own authorisation; this lib enforces transactional consistency only.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("consultations:lib");

// ── Types ────────────────────────────────────────────────────────────────

export type AvailabilitySlotStatus = "open" | "booked" | "cancelled";

export interface AvailabilitySlot {
  id: number;
  professional_id: number;
  team_id: number | null;
  start_at: string;
  end_at: string;
  status: AvailabilitySlotStatus;
  created_at: string;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface ConsultationBooking {
  id: number;
  slot_id: number;
  brief_id: number;
  consumer_user_id: string | null;
  consumer_email: string;
  consumer_notes: string | null;
  meet_url: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

// ── Errors ───────────────────────────────────────────────────────────────

export class ConsultationError extends Error {
  readonly code:
    | "invalid_input"
    | "slot_not_found"
    | "slot_not_open"
    | "booking_not_found"
    | "db_error";
  readonly status: number;
  constructor(
    code: ConsultationError["code"],
    message: string,
    status: number,
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

interface CreateSlotInput {
  professionalId: number;
  teamId?: number | null;
  startAt: string;
  endAt: string;
}

/**
 * Create a new open availability slot for a pro.
 *
 * Returns 400-shaped errors when start/end are invalid or the DB rejects
 * (typically the overlap-prevention EXCLUDE constraint).
 */
export async function createSlot(
  input: CreateSlotInput,
): Promise<AvailabilitySlot> {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ConsultationError(
      "invalid_input",
      "start_at and end_at must be valid ISO timestamps.",
      400,
    );
  }
  if (end.getTime() <= start.getTime()) {
    throw new ConsultationError(
      "invalid_input",
      "end_at must be strictly after start_at.",
      400,
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pro_availability_slots")
    .insert({
      professional_id: input.professionalId,
      team_id: input.teamId ?? null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "open",
    })
    .select("*")
    .single();

  if (error) {
    // Most common cause: the EXCLUDE constraint fires when this slot
    // overlaps an existing open / booked slot for the same pro.
    log.warn("createSlot insert failed", {
      professionalId: input.professionalId,
      err: error.message,
    });
    throw new ConsultationError(
      "db_error",
      "Could not create slot — does it overlap with an existing one?",
      409,
    );
  }
  return data as unknown as AvailabilitySlot;
}

/**
 * List availability for a given pro. By default returns only `open`
 * future slots (so the brief tracker can offer them to the consumer).
 * Callers that want booked / past slots pass an explicit window.
 */
export async function listAvailabilityForPro(
  professionalId: number,
  fromDate?: string,
  toDate?: string,
): Promise<AvailabilitySlot[]> {
  const admin = createAdminClient();
  let query = admin
    .from("pro_availability_slots")
    .select("*")
    .eq("professional_id", professionalId)
    .eq("status", "open")
    .order("start_at", { ascending: true });

  // Default lower bound: now (no past slots).
  const lower = fromDate ?? new Date().toISOString();
  query = query.gte("start_at", lower);
  if (toDate) query = query.lte("start_at", toDate);

  const { data, error } = await query;
  if (error) {
    log.warn("listAvailabilityForPro failed", {
      professionalId,
      err: error.message,
    });
    return [];
  }
  return (data ?? []) as unknown as AvailabilitySlot[];
}

/**
 * Pro-side listing — includes all slot statuses, both upcoming and a
 * 30-day history window so the pros/availability page can render what
 * happened recently too.
 */
export async function listAllSlotsForPro(
  professionalId: number,
): Promise<AvailabilitySlot[]> {
  const admin = createAdminClient();
  const lower = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("pro_availability_slots")
    .select("*")
    .eq("professional_id", professionalId)
    .gte("start_at", lower)
    .order("start_at", { ascending: true });
  if (error) {
    log.warn("listAllSlotsForPro failed", {
      professionalId,
      err: error.message,
    });
    return [];
  }
  return (data ?? []) as unknown as AvailabilitySlot[];
}

interface BookSlotInput {
  slotId: number;
  briefId: number;
  consumerEmail: string;
  consumerUserId?: string | null;
  consumerNotes?: string | null;
}

export interface BookSlotResult {
  slot: AvailabilitySlot;
  booking: ConsultationBooking;
}

/**
 * Book an open slot. Atomic in two stages:
 *
 *   1. UPDATE pro_availability_slots SET status='booked'
 *      WHERE id = $1 AND status = 'open'  RETURNING *;
 *      → if zero rows returned, the slot is gone (someone beat us).
 *   2. INSERT INTO consultation_bookings (...).
 *      → on UNIQUE(slot_id) collision the insert fails and we roll the
 *        slot back to 'open' so the next consumer can try.
 *
 * The two-step pattern is safer than a single INSERT-with-trigger
 * because the slot status check is the source of truth — Postgres won't
 * let us double-book.
 */
export async function bookSlot(input: BookSlotInput): Promise<BookSlotResult> {
  const admin = createAdminClient();

  // ── 1. Optimistic claim on the slot row ──
  const { data: claimed, error: claimErr } = await admin
    .from("pro_availability_slots")
    .update({ status: "booked" })
    .eq("id", input.slotId)
    .eq("status", "open")
    .select("*")
    .maybeSingle();

  if (claimErr) {
    log.warn("bookSlot slot claim failed", {
      slotId: input.slotId,
      err: claimErr.message,
    });
    throw new ConsultationError("db_error", "Could not book slot.", 500);
  }
  if (!claimed) {
    throw new ConsultationError(
      "slot_not_open",
      "This slot is no longer available.",
      409,
    );
  }

  // ── 2. Create the booking row ──
  const { data: booking, error: bookErr } = await admin
    .from("consultation_bookings")
    .insert({
      slot_id: input.slotId,
      brief_id: input.briefId,
      consumer_user_id: input.consumerUserId ?? null,
      consumer_email: input.consumerEmail.toLowerCase().trim(),
      consumer_notes: input.consumerNotes ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (bookErr || !booking) {
    // Roll the slot back so the next booker can try.
    await admin
      .from("pro_availability_slots")
      .update({ status: "open" })
      .eq("id", input.slotId);
    log.warn("bookSlot insert failed (rolled back slot)", {
      slotId: input.slotId,
      briefId: input.briefId,
      err: bookErr?.message,
    });
    throw new ConsultationError(
      "db_error",
      "Could not create booking.",
      500,
    );
  }

  return {
    slot: claimed as unknown as AvailabilitySlot,
    booking: booking as unknown as ConsultationBooking,
  };
}

/**
 * Cancel a booking by either party. Flips both the booking and the
 * underlying slot — the slot is restored to 'open' so it can be
 * re-booked (caller decides whether to also delete the slot).
 *
 * `byKind` is recorded for audit; behaviour is identical for either
 * party today, but keeps the door open for "consumer-cancelled" specific
 * notifications later.
 */
export async function cancelBooking(
  bookingId: number,
  byKind: "consumer" | "professional",
): Promise<ConsultationBooking> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("consultation_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!existing) {
    throw new ConsultationError(
      "booking_not_found",
      "Booking not found.",
      404,
    );
  }

  const { data: updated, error } = await admin
    .from("consultation_bookings")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select("*")
    .single();
  if (error || !updated) {
    log.warn("cancelBooking failed", {
      bookingId,
      err: error?.message,
    });
    throw new ConsultationError(
      "db_error",
      "Could not cancel booking.",
      500,
    );
  }

  // Free the slot so it can be re-booked.
  await admin
    .from("pro_availability_slots")
    .update({ status: "open" })
    .eq("id", existing.slot_id as number);

  log.info("booking cancelled", { bookingId, byKind });
  return updated as unknown as ConsultationBooking;
}

interface ConfirmBookingInput {
  meetUrl?: string | null;
}

/**
 * Pro confirms a booking. Optionally attaches a meet URL (Google Meet,
 * Zoom, etc.) — v1 doesn't validate the URL host beyond "looks like a
 * URL" because pros may use first-party Calendly / internal tools.
 */
export async function confirmBooking(
  bookingId: number,
  input: ConfirmBookingInput = {},
): Promise<ConsultationBooking> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    status: "confirmed",
    updated_at: new Date().toISOString(),
  };
  if (input.meetUrl !== undefined && input.meetUrl !== null) {
    const trimmed = input.meetUrl.trim();
    if (trimmed.length > 0) {
      try {
        // Throws on invalid URL. We don't store the parsed value — we
        // keep what the pro typed so it's identical in their tooling.
        new URL(trimmed);
        patch.meet_url = trimmed;
      } catch {
        throw new ConsultationError(
          "invalid_input",
          "meet_url must be a valid URL.",
          400,
        );
      }
    }
  }

  const { data, error } = await admin
    .from("consultation_bookings")
    .update(patch)
    .eq("id", bookingId)
    .select("*")
    .maybeSingle();
  if (error) {
    log.warn("confirmBooking failed", { bookingId, err: error.message });
    throw new ConsultationError(
      "db_error",
      "Could not confirm booking.",
      500,
    );
  }
  if (!data) {
    throw new ConsultationError(
      "booking_not_found",
      "Booking not found.",
      404,
    );
  }
  return data as unknown as ConsultationBooking;
}

/**
 * Fetch a single booking by id.
 */
export async function getBooking(
  bookingId: number,
): Promise<ConsultationBooking | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("consultation_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  return (data as unknown as ConsultationBooking) ?? null;
}

/**
 * Fetch the slot a booking refers to.
 */
export async function getSlot(slotId: number): Promise<AvailabilitySlot | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pro_availability_slots")
    .select("*")
    .eq("id", slotId)
    .maybeSingle();
  return (data as unknown as AvailabilitySlot) ?? null;
}

/**
 * List bookings tied to a particular brief — used by the brief tracker
 * UI to show "you have a meeting confirmed for …".
 */
export async function listBookingsForBrief(
  briefId: number,
): Promise<ConsultationBooking[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("consultation_bookings")
    .select("*")
    .eq("brief_id", briefId)
    .order("created_at", { ascending: false });
  if (error) {
    log.warn("listBookingsForBrief failed", { briefId, err: error.message });
    return [];
  }
  return (data ?? []) as unknown as ConsultationBooking[];
}
