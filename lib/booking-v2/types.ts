/**
 * Local row types for the booking-v2 feature.
 *
 * We do NOT edit lib/database.types.ts (generated) — the v2 columns added by
 * supabase/migrations/20260612212000_booking_v2.sql are typed here so the
 * feature compiles independently and degrades safely (every v2 column is
 * optional, so code reading a row from a DB that hasn't run the migration yet
 * sees `undefined` rather than a type error).
 */

/** Day-of-week 0..6 (0 = Sunday), matching advisor_booking_slots. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A row of the weekly recurring availability template. */
export interface BookingSlotTemplateRow {
  id: number;
  professional_id: number;
  day_of_week: number;
  /** "HH:MM:SS" (time without tz). */
  start_time: string;
  /** "HH:MM:SS". */
  end_time: string;
  slot_duration_minutes: number | null;
  is_active: boolean | null;
}

/** advisor_bookings row including the v2 columns (all v2 fields optional). */
export interface AdvisorBookingRow {
  id: number;
  professional_id: number;
  lead_id: number | null;
  investor_name: string;
  investor_email: string;
  investor_phone: string | null;
  /** "YYYY-MM-DD". */
  booking_date: string;
  /** "HH:MM:SS" wall-clock in booking_tz. */
  booking_time: string;
  duration_minutes: number | null;
  topic: string | null;
  status: AdvisorBookingStatus;
  source_page: string | null;
  created_at: string | null;
  updated_at: string | null;
  confirmation_token: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  // ── v2 additions ──
  reschedule_token?: string | null;
  reminder_24h_sent_at?: string | null;
  reminder_1h_sent_at?: string | null;
  rescheduled_from_id?: number | null;
  /** Precise UTC instant of the start (ISO). */
  starts_at_utc?: string | null;
  booking_tz?: string | null;
}

export type AdvisorBookingStatus =
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

/** advisor_booking_appointments row (concrete free slot). */
export interface AppointmentRow {
  id: number;
  professional_id: number;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  status: "open" | "taken" | "cancelled";
  booked_by_email: string | null;
  booked_by_name: string | null;
  notes: string | null;
  lead_id: number | null;
}

/** Structured payload stored on brief_messages.metadata for a propose-times message. */
export interface ProposeTimesPayload {
  kind: "propose_times";
  /** advisor_booking_appointments ids the consumer can claim. */
  appointmentIds: number[];
  /** Denormalised slot times so the chat can render without an extra fetch. */
  slots: { id: number; startsAt: string; endsAt: string }[];
  /** Set to the claimed appointment id once a slot is booked. */
  bookedAppointmentId?: number;
}
