/**
 * Advisor booking (first-party appointments).
 *
 * Wraps `advisor_booking_appointments` — a table of concrete
 * time slots an advisor is willing to meet. Flow:
 *
 *   1. Advisor (or admin) creates slots via addSlots(). Each slot
 *      is { professional_id, starts_at, ends_at }.
 *   2. Public reader fetches open slots via listOpenSlots() from
 *      the advisor profile page.
 *   3. Reader claims a slot via claimSlot(). This is the only
 *      write path — we don't allow free-form booking times; the
 *      advisor controls supply.
 *   4. Advisor can cancel a booked slot via cancelSlot().
 *
 * Race handling: claimSlot uses a conditional update (status=open
 * → status=taken) so two concurrent readers can't double-book.
 * The second one sees `ok: false, error: already_taken`.
 *
 * Externals:
 *   - professionals.booking_link (escape hatch to Calendly/etc)
 *     is separate from this table. Advisors can use either but
 *     not both — the profile page shows booking_link if set,
 *     otherwise shows first-party slots.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("advisor-booking");

export type SlotStatus = "open" | "taken" | "cancelled";

export interface BookingSlotRow {
  id: number;
  professional_id: number;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  status: SlotStatus;
  booked_by_email: string | null;
  booked_by_name: string | null;
  booked_at: string | null;
  lead_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddSlotInput {
  professionalId: number;
  startsAt: string;       // ISO
  durationMinutes: number;
  notes?: string | null;
}

/**
 * Create a single slot. Callers typically add multiple via
 * addSlots() batch helper.
 */
export async function addSlot(
  input: AddSlotInput,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  if (input.durationMinutes <= 0 || input.durationMinutes > 240) {
    return { ok: false, error: "duration_out_of_range" };
  }
  const starts = new Date(input.startsAt);
  if (Number.isNaN(starts.getTime())) {
    return { ok: false, error: "invalid_starts_at" };
  }
  const ends = new Date(starts.getTime() + input.durationMinutes * 60 * 1000);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("advisor_booking_appointments")
      .insert({
        professional_id: input.professionalId,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        duration_minutes: input.durationMinutes,
        status: "open",
        notes: input.notes || null,
      })
      .select("id")
      .single();
    if (error) {
      log.warn("addSlot insert failed", { error: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true, id: (data as { id: number }).id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function addSlots(
  inputs: AddSlotInput[],
): Promise<{ total: number; succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;
  for (const input of inputs) {
    const r = await addSlot(input);
    if (r.ok) succeeded += 1;
    else failed += 1;
  }
  return { total: inputs.length, succeeded, failed };
}

export async function listOpenSlots(
  professionalId: number,
  limit = 20,
): Promise<BookingSlotRow[]> {
  try {
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("advisor_booking_appointments")
      .select("*")
      .eq("professional_id", professionalId)
      .eq("status", "open")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(limit);
    return (data as BookingSlotRow[] | null) || [];
  } catch {
    return [];
  }
}

export interface ClaimSlotInput {
  slotId: number;
  bookedByEmail: string;
  bookedByName: string;
  leadId?: number | null;
}

export async function claimSlot(
  input: ClaimSlotInput,
): Promise<{ ok: boolean; error?: string; slot?: BookingSlotRow }> {
  if (!input.slotId || !input.bookedByEmail || !input.bookedByName) {
    return { ok: false, error: "missing_fields" };
  }
  try {
    const supabase = createAdminClient();
    // Read first so we can verify state + return a helpful error.
    const { data: existing } = await supabase
      .from("advisor_booking_appointments")
      .select("*")
      .eq("id", input.slotId)
      .maybeSingle();
    if (!existing) return { ok: false, error: "not_found" };
    const slot = existing as BookingSlotRow;
    if (slot.status !== "open") {
      return { ok: false, error: "already_taken" };
    }
    if (new Date(slot.starts_at).getTime() <= Date.now()) {
      return { ok: false, error: "slot_in_past" };
    }

    // Conditional update — only succeeds if status is still 'open'.
    // A concurrent claim that happened between the select and
    // update will not see the row as open and update nothing.
    const { data: updated, error } = await supabase
      .from("advisor_booking_appointments")
      .update({
        status: "taken",
        booked_by_email: input.bookedByEmail.toLowerCase().trim(),
        booked_by_name: input.bookedByName.trim(),
        booked_at: new Date().toISOString(),
        lead_id: input.leadId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.slotId)
      .eq("status", "open")
      .select("*")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!updated) return { ok: false, error: "already_taken" };
    return { ok: true, slot: updated as BookingSlotRow };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function cancelSlot(
  slotId: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("advisor_booking_appointments")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", slotId);
    return { ok: !error, error: error?.message };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
