/**
 * booking-v2 — First-Party Scheduling v2 (idea #12) service helpers.
 *
 * Everything here is DORMANT behind the `booking_v2` feature flag (fail-closed).
 * Routes/components call `isBookingV2Enabled()` first; with the flag off the
 * availability editor, slot picker, propose-times and reminder cron all no-op.
 *
 * Tables touched (all pre-existing — see migration 20260612212000_booking_v2):
 *   - advisor_booking_slots ........ weekly recurring availability template
 *   - advisor_bookings ............. concrete consumer bookings (PII)
 *   - advisor_booking_appointments . concrete free slots (chat "propose times")
 *
 * Service-role rationale: advisor_bookings is a PII table with deny-all reads
 * for anon/authenticated (admin SELECT + public INSERT only); all server-side
 * reads/updates here go through the admin client, consistent with the existing
 * /api/advisor-booking route and CLAUDE.md's documented scope for PII /
 * service_role-only tables.
 */

import { randomBytes } from "node:crypto";

// eslint-disable-next-line no-restricted-imports -- advisor_bookings is a PII table (admin SELECT + public INSERT + service_role ALL; no authenticated read policy) and advisor_booking_slots edits run on behalf of the advisor session (not auth.uid()-scoped). Service-role is the documented path for these tables per CLAUDE.md. Route handlers own authorisation.
import { createAdminClient } from "@/lib/supabase/admin";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import {
  buildIcsAttachment,
  type IcsMethod,
} from "@/lib/ics";
import { sendEmail } from "@/lib/resend";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";
import {
  bookingStartUtc,
  addMinutes,
  utcToZonedWallClock,
  formatBookingForHumans,
} from "@/lib/booking-v2/time";
import type {
  AdvisorBookingRow,
  BookingSlotTemplateRow,
  DayOfWeek,
} from "@/lib/booking-v2/types";

const log = logger("booking-v2");

export const BOOKING_V2_FLAG = "booking_v2";
export const DEFAULT_BOOKING_TZ = "Australia/Sydney";
const FROM = "Invest.com.au <hello@invest.com.au>";

// ── Flag gate ──────────────────────────────────────────────────────────────

/**
 * Is scheduling-v2 enabled? Fails closed (flag absent / DB error → false).
 * `advisorEmail` lets the flag's allowlist target specific advisers for
 * staged rollout.
 */
export function isBookingV2Enabled(advisorEmail?: string | null): Promise<boolean> {
  return isFlagEnabled(BOOKING_V2_FLAG, {
    userKey: advisorEmail ?? undefined,
    segment: "advisor",
  });
}

// ── Tokens ───────────────────────────────────────────────────────────────

/** One-time token for reschedule/cancel links — same posture as outcome tokens. */
export function newBookingToken(): string {
  return randomBytes(24).toString("hex");
}

// ── Weekly availability template CRUD (advisor_booking_slots) ────────────────

function isValidHmsRange(start: string, end: string): boolean {
  const toMin = (t: string): number | null => {
    const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(t);
    if (!m) return null;
    const h = Number(m[1]);
    const mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  };
  const s = toMin(start);
  const e = toMin(end);
  if (s === null || e === null) return false;
  return e > s;
}

export interface WeeklyTemplateInput {
  dayOfWeek: DayOfWeek;
  /** "HH:MM" or "HH:MM:SS". */
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive?: boolean;
}

/** List an advisor's weekly availability template rows. */
export async function listWeeklyTemplate(
  professionalId: number,
): Promise<BookingSlotTemplateRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisor_booking_slots")
    .select(
      "id, professional_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active",
    )
    .eq("professional_id", professionalId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) {
    log.warn("listWeeklyTemplate failed", { error: error.message });
    return [];
  }
  return (data as BookingSlotTemplateRow[] | null) ?? [];
}

/**
 * Replace an advisor's entire weekly template with the supplied rows
 * (delete-then-insert in one logical operation). Atomicity is "good enough":
 * the delete + insert run back-to-back on the admin client; on insert failure
 * we report it and the caller surfaces an error. Also flips professionals
 * .booking_enabled to reflect whether any active windows remain, so the public
 * BookingWidget shows/hides the picker correctly.
 */
export async function replaceWeeklyTemplate(
  professionalId: number,
  rows: WeeklyTemplateInput[],
): Promise<{ ok: boolean; error?: string; count?: number }> {
  // Validate up front — reject the whole batch on any bad row.
  for (const r of rows) {
    if (r.dayOfWeek < 0 || r.dayOfWeek > 6) {
      return { ok: false, error: "invalid_day_of_week" };
    }
    if (!isValidHmsRange(r.startTime, r.endTime)) {
      return { ok: false, error: "invalid_time_range" };
    }
    if (r.slotDurationMinutes < 5 || r.slotDurationMinutes > 240) {
      return { ok: false, error: "invalid_duration" };
    }
  }

  const admin = createAdminClient();
  const { error: delError } = await admin
    .from("advisor_booking_slots")
    .delete()
    .eq("professional_id", professionalId);
  if (delError) {
    log.warn("replaceWeeklyTemplate delete failed", { error: delError.message });
    return { ok: false, error: "delete_failed" };
  }

  const normalise = (t: string): string =>
    /^\d{2}:\d{2}$/.test(t) ? `${t}:00` : t;

  let insertedCount = 0;
  if (rows.length > 0) {
    const payload = rows.map((r) => ({
      professional_id: professionalId,
      day_of_week: r.dayOfWeek,
      start_time: normalise(r.startTime),
      end_time: normalise(r.endTime),
      slot_duration_minutes: r.slotDurationMinutes,
      is_active: r.isActive ?? true,
    }));
    const { data, error: insError } = await admin
      .from("advisor_booking_slots")
      .insert(payload)
      .select("id");
    if (insError) {
      log.warn("replaceWeeklyTemplate insert failed", { error: insError.message });
      return { ok: false, error: "insert_failed" };
    }
    insertedCount = (data as { id: number }[] | null)?.length ?? 0;
  }

  // Keep booking_enabled in sync with whether any active window exists.
  const hasActive = rows.some((r) => r.isActive ?? true);
  const { error: flagError } = await admin
    .from("professionals")
    .update({ booking_enabled: hasActive })
    .eq("id", professionalId);
  if (flagError) {
    log.warn("replaceWeeklyTemplate booking_enabled update failed", {
      error: flagError.message,
    });
    // Non-fatal: the template was saved; the public toggle just lagged.
  }

  return { ok: true, count: insertedCount };
}

// ── Booking confirmation / reschedule / cancel (advisor_bookings) ────────────

interface BookingPartiesEmailInput {
  booking: AdvisorBookingRow;
  advisorName: string;
  advisorEmail: string | null;
  method: IcsMethod;
  /** When CANCEL: bump sequence so clients supersede the prior invite. */
  sequence?: number;
}

/** Stable UID for a booking's calendar event — constant across REQUEST/CANCEL. */
export function bookingUid(bookingId: number): string {
  return `advisor-booking-${bookingId}@invest.com.au`;
}

/**
 * Send the confirmation (or cancellation) email to BOTH the consumer and the
 * advisor, each with the appropriate .ics invite attached. Best-effort and
 * non-throwing — booking success never depends on email delivery.
 *
 * METHOD:REQUEST on confirm, METHOD:CANCEL on cancellation. The cancel reuses
 * the same UID so the recipient's calendar removes the original event.
 */
export async function sendBookingPartiesEmail(
  input: BookingPartiesEmailInput,
): Promise<void> {
  const { booking, advisorName, advisorEmail, method } = input;
  const tz = booking.booking_tz ?? DEFAULT_BOOKING_TZ;

  const startUtc = booking.starts_at_utc
    ? new Date(booking.starts_at_utc)
    : bookingStartUtc(booking.booking_date, booking.booking_time, tz);
  const durationMins = booking.duration_minutes ?? 30;
  const endUtc = addMinutes(startUtc, durationMins);

  const when = formatBookingForHumans(startUtc, tz);
  const site = getSiteUrl();
  const manageUrl = booking.reschedule_token
    ? `${site}/booking/${booking.reschedule_token}/manage`
    : undefined;

  const summary = `Consultation with ${advisorName}`;
  const isCancel = method === "CANCEL";

  // The ICS DTSTART/DTEND use the TZID (wall-clock) form so the event lands at
  // the correct local time in the recipient's calendar regardless of their own
  // zone, while still anchored to Australia/Sydney.
  const ics = buildIcsAttachment({
    method,
    filename: isCancel ? "cancelled.ics" : "booking.ics",
    event: {
      uid: bookingUid(booking.id),
      start: { local: utcToZonedWallClock(startUtc, tz), tzid: tz },
      end: { local: utcToZonedWallClock(endUtc, tz), tzid: tz },
      summary,
      description: booking.topic
        ? `Topic: ${booking.topic}`
        : "Initial consultation booked via Invest.com.au.",
      location: "Online / phone — the adviser will confirm details.",
      url: manageUrl,
      organizer: advisorEmail
        ? { email: advisorEmail, name: advisorName }
        : undefined,
      attendees: [
        { email: booking.investor_email, name: booking.investor_name, rsvp: true },
        ...(advisorEmail ? [{ email: advisorEmail, name: advisorName }] : []),
      ],
      status: isCancel ? "CANCELLED" : "CONFIRMED",
      sequence: input.sequence ?? (isCancel ? 1 : 0),
    },
  });

  const attachments = [ics];

  // ── Consumer email ──
  const consumerSubject = isCancel
    ? `Booking cancelled: ${advisorName}`
    : `Booking confirmed: ${advisorName} — ${when}`;
  const consumerHtml = isCancel
    ? `<p>Your consultation with <strong>${escapeHtml(advisorName)}</strong> on <strong>${escapeHtml(when)}</strong> has been cancelled.</p>` +
      `<p>The calendar invite attached will remove the event from your calendar.</p>` +
      (manageUrl
        ? `<p><a href="${site}/advisor">Find another time or adviser →</a></p>`
        : "")
    : `<p>Your consultation with <strong>${escapeHtml(advisorName)}</strong> is confirmed for <strong>${escapeHtml(when)}</strong>.</p>` +
      `<p>Add it to your calendar with the attached invite.</p>` +
      (manageUrl
        ? `<p><a href="${manageUrl}">Reschedule or cancel →</a></p>`
        : "") +
      `<p style="font-size:12px;color:#94a3b8">Booked through <a href="${site}">Invest.com.au</a></p>`;

  await sendEmail({
    to: booking.investor_email,
    from: FROM,
    subject: consumerSubject,
    html: consumerHtml,
    attachments,
    // Booking confirmations are transactional — the recipient explicitly
    // requested this meeting, so deliver even if on a marketing-suppression
    // list. Cancellations equally must reach them.
    bypassSuppression: true,
  });

  // ── Advisor email ──
  if (advisorEmail) {
    const advisorSubject = isCancel
      ? `Cancelled: ${booking.investor_name} — ${when}`
      : `New booking: ${booking.investor_name} — ${when}`;
    const advisorHtml = isCancel
      ? `<p><strong>${escapeHtml(booking.investor_name)}</strong>'s consultation on <strong>${escapeHtml(when)}</strong> has been cancelled.</p>`
      : `<p><strong>${escapeHtml(booking.investor_name)}</strong> (${escapeHtml(booking.investor_email)}${booking.investor_phone ? `, ${escapeHtml(booking.investor_phone)}` : ""}) booked a consultation on <strong>${escapeHtml(when)}</strong>.</p>` +
        (booking.topic ? `<p>Topic: ${escapeHtml(booking.topic)}</p>` : "") +
        `<p><a href="${site}/advisor-portal">View in your dashboard →</a></p>`;
    await sendEmail({
      to: advisorEmail,
      from: FROM,
      subject: advisorSubject,
      html: advisorHtml,
      attachments,
      bypassSuppression: true,
    });
  }
}

/** Fetch a booking by its reschedule token (admin; PII table). */
export async function getBookingByRescheduleToken(
  token: string,
): Promise<AdvisorBookingRow | null> {
  if (!token || token.length < 10) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("advisor_bookings")
    .select("*")
    .eq("reschedule_token", token)
    .maybeSingle();
  return (data as AdvisorBookingRow | null) ?? null;
}

/** Fetch a booking by its confirmation (cancel) token. */
export async function getBookingByConfirmationToken(
  token: string,
): Promise<AdvisorBookingRow | null> {
  if (!token || token.length < 10) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("advisor_bookings")
    .select("*")
    .eq("confirmation_token", token)
    .maybeSingle();
  return (data as AdvisorBookingRow | null) ?? null;
}

/**
 * Cancel a booking (consumer- or advisor-initiated). Idempotent: cancelling an
 * already-cancelled booking returns ok with `alreadyCancelled`. Sends the
 * METHOD:CANCEL invite to both parties.
 */
export async function cancelBooking(
  bookingId: number,
  reason: string | null,
): Promise<{ ok: boolean; error?: string; alreadyCancelled?: boolean }> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("advisor_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "not_found" };
  const booking = existing as AdvisorBookingRow;
  if (booking.status === "cancelled") {
    return { ok: true, alreadyCancelled: true };
  }

  const { error } = await admin
    .from("advisor_bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .neq("status", "cancelled");
  if (error) return { ok: false, error: error.message };

  const { data: pro } = await admin
    .from("professionals")
    .select("name, email")
    .eq("id", booking.professional_id)
    .maybeSingle();

  await sendBookingPartiesEmail({
    booking: { ...booking, status: "cancelled" },
    advisorName: (pro?.name as string) ?? "your adviser",
    advisorEmail: (pro?.email as string) ?? null,
    method: "CANCEL",
    sequence: 2,
  });

  return { ok: true };
}

/**
 * Reschedule a booking to a new date/time. Implemented as cancel-old +
 * create-new so the calendar invite chain is clean: the old event is CANCELLED
 * (METHOD:CANCEL) and a fresh CONFIRMED event (METHOD:REQUEST) is issued. The
 * new row links back via rescheduled_from_id and carries fresh tokens.
 *
 * Validates the new slot against the advisor's weekly template and guards
 * against double-booking the target time. Idempotent only in the sense that a
 * cancelled source booking can't be rescheduled (returns an error).
 */
export async function rescheduleBooking(args: {
  bookingId: number;
  newDate: string; // YYYY-MM-DD
  newTime: string; // HH:MM or HH:MM:SS
}): Promise<{ ok: boolean; error?: string; newBookingId?: number; rescheduleToken?: string }> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("advisor_bookings")
    .select("*")
    .eq("id", args.bookingId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "not_found" };
  const src = existing as AdvisorBookingRow;
  if (src.status === "cancelled") return { ok: false, error: "already_cancelled" };

  const tz = src.booking_tz ?? DEFAULT_BOOKING_TZ;
  const normTime = /^\d{2}:\d{2}$/.test(args.newTime)
    ? `${args.newTime}:00`
    : args.newTime;

  // New time must be in the future.
  const newStartUtc = bookingStartUtc(args.newDate, normTime, tz);
  if (newStartUtc.getTime() <= Date.now()) {
    return { ok: false, error: "slot_in_past" };
  }

  // New time must fall inside an active weekly window for this advisor and align
  // to the slot grid. (Same generation rule the public picker uses.)
  const template = await listWeeklyTemplate(src.professional_id);
  if (!isTimeWithinTemplate(args.newDate, normTime, tz, template)) {
    return { ok: false, error: "slot_unavailable" };
  }

  // Target time not already taken.
  const { data: clash } = await admin
    .from("advisor_bookings")
    .select("id")
    .eq("professional_id", src.professional_id)
    .eq("booking_date", args.newDate)
    .eq("booking_time", normTime)
    .neq("status", "cancelled")
    .maybeSingle();
  if (clash) return { ok: false, error: "already_taken" };

  // Cancel the source (sends CANCEL invite).
  const cancelled = await cancelBooking(args.bookingId, "rescheduled");
  if (!cancelled.ok && !cancelled.alreadyCancelled) {
    return { ok: false, error: cancelled.error ?? "cancel_failed" };
  }

  // Create the new booking with fresh tokens.
  const confirmationToken = newBookingToken();
  const rescheduleToken = newBookingToken();
  const { data: created, error: insErr } = await admin
    .from("advisor_bookings")
    .insert({
      professional_id: src.professional_id,
      lead_id: src.lead_id,
      investor_name: src.investor_name,
      investor_email: src.investor_email,
      investor_phone: src.investor_phone,
      booking_date: args.newDate,
      booking_time: normTime,
      duration_minutes: src.duration_minutes ?? 30,
      topic: src.topic,
      source_page: src.source_page,
      status: "confirmed",
      starts_at_utc: newStartUtc.toISOString(),
      booking_tz: tz,
      confirmation_token: confirmationToken,
      reschedule_token: rescheduleToken,
      rescheduled_from_id: src.id,
    })
    .select("*")
    .single();
  if (insErr || !created) {
    return { ok: false, error: insErr?.message ?? "create_failed" };
  }

  const { data: pro } = await admin
    .from("professionals")
    .select("name, email")
    .eq("id", src.professional_id)
    .maybeSingle();

  await sendBookingPartiesEmail({
    booking: created as AdvisorBookingRow,
    advisorName: (pro?.name as string) ?? "your adviser",
    advisorEmail: (pro?.email as string) ?? null,
    method: "REQUEST",
  });

  return {
    ok: true,
    newBookingId: (created as { id: number }).id,
    rescheduleToken,
  };
}

/**
 * Does a wall-clock date+time fall on an active slot boundary inside the
 * advisor's weekly template? Mirrors the public picker's slot generation:
 * a window [start_time, end_time) produces slots every slot_duration_minutes,
 * and a time is valid iff it equals one of those grid points and the slot fits.
 */
export function isTimeWithinTemplate(
  date: string,
  time: string, // HH:MM:SS
  _tz: string,
  template: BookingSlotTemplateRow[],
): boolean {
  const localDow = zonedDayOfWeek(date);
  const [hh, mm] = time.split(":");
  const minutes = Number(hh) * 60 + Number(mm);

  for (const row of template) {
    if (row.is_active === false) continue;
    if (row.day_of_week !== localDow) continue;
    const sm = hmsToMinutes(row.start_time);
    const em = hmsToMinutes(row.end_time);
    const dur = row.slot_duration_minutes ?? 30;
    if (sm === null || em === null) continue;
    if (minutes < sm || minutes + dur > em) continue;
    if ((minutes - sm) % dur === 0) return true;
  }
  return false;
}

function hmsToMinutes(t: string): number | null {
  const m = /^(\d{2}):(\d{2})/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Day-of-week (0=Sun..6=Sat) for a YYYY-MM-DD date, calendar-date based. */
function zonedDayOfWeek(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return -1;
  // Use UTC noon to avoid any tz edge flipping the calendar day.
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return d.getUTCDay();
}

// ── Chat "propose times" (advisor_booking_appointments) ─────────────────────

/**
 * Create concrete free-slot appointment rows for a chat proposal. The adviser
 * proposes 2–3 specific datetimes for a given brief's accepting professional;
 * each becomes an `advisor_booking_appointments` row tagged with the brief's
 * lead_id (best-effort) so the booking is traceable back to the brief. No
 * payment is involved (free booking — regulatory lean lane).
 *
 * Returns the created slots so the caller can attach them to the chat message
 * metadata. On any insert failure the whole batch is reported failed.
 */
export async function createProposalAppointments(args: {
  professionalId: number;
  leadId?: number | null;
  slots: { startsAt: string; durationMinutes: number }[];
  note?: string | null;
}): Promise<{ ok: boolean; error?: string; created: { id: number; startsAt: string; endsAt: string }[] }> {
  if (args.slots.length < 1 || args.slots.length > 3) {
    return { ok: false, error: "slot_count_out_of_range", created: [] };
  }
  const admin = createAdminClient();
  const created: { id: number; startsAt: string; endsAt: string }[] = [];

  for (const s of args.slots) {
    const start = new Date(s.startsAt);
    if (Number.isNaN(start.getTime())) {
      return { ok: false, error: "invalid_start", created };
    }
    if (start.getTime() <= Date.now()) {
      return { ok: false, error: "slot_in_past", created };
    }
    if (s.durationMinutes < 5 || s.durationMinutes > 240) {
      return { ok: false, error: "invalid_duration", created };
    }
    const end = new Date(start.getTime() + s.durationMinutes * 60_000);
    const { data, error } = await admin
      .from("advisor_booking_appointments")
      .insert({
        professional_id: args.professionalId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        duration_minutes: s.durationMinutes,
        status: "open",
        lead_id: args.leadId ?? null,
        notes: args.note ?? null,
      })
      .select("id, starts_at, ends_at")
      .single();
    if (error || !data) {
      return { ok: false, error: error?.message ?? "insert_failed", created };
    }
    const row = data as { id: number; starts_at: string; ends_at: string };
    created.push({ id: row.id, startsAt: row.starts_at, endsAt: row.ends_at });
  }

  return { ok: true, created };
}

/**
 * Accept a proposed time: claim one appointment (atomic open→taken) and cancel
 * the sibling proposed slots so they free up. The claim mirrors the existing
 * advisor_booking_appointments claim semantics (conditional update).
 */
export async function acceptProposedTime(args: {
  appointmentId: number;
  siblingIds: number[];
  bookedByEmail: string;
  bookedByName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  // Conditional update — only claims if still open.
  const { data: claimed, error } = await admin
    .from("advisor_booking_appointments")
    .update({
      status: "taken",
      booked_by_email: args.bookedByEmail.toLowerCase().trim(),
      booked_by_name: args.bookedByName.trim(),
      booked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.appointmentId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!claimed) return { ok: false, error: "already_taken" };

  // Free the unchosen siblings (best-effort).
  const others = args.siblingIds.filter((id) => id !== args.appointmentId);
  if (others.length > 0) {
    await admin
      .from("advisor_booking_appointments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .in("id", others)
      .eq("status", "open");
  }

  return { ok: true };
}

/**
 * Mark a booking's outcome (completed | no_show). The status CHECK already
 * permits these values. Writes the appointment row only — feeds nothing
 * downstream automatically (no clean shared write path exists for booking-level
 * outcomes today; see final report). Idempotent.
 */
export async function markBookingOutcome(
  bookingId: number,
  outcome: "completed" | "no_show",
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("advisor_bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "not_found" };
  const status = (existing as { status: string }).status;
  if (status === "cancelled") return { ok: false, error: "already_cancelled" };

  const { error } = await admin
    .from("advisor_bookings")
    .update({ status: outcome, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
