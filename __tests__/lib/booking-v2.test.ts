import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// Feature flag — controllable per test.
const isFlagEnabledMock = vi.hoisted(() => vi.fn(async () => false));
vi.mock("@/lib/feature-flags", () => ({ isFlagEnabled: isFlagEnabledMock }));

// Resend — capture sends.
const sendEmailMock = vi.hoisted(() => vi.fn(async () => ({ ok: true })));
vi.mock("@/lib/resend", () => ({ sendEmail: sendEmailMock }));

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));

// Admin client — a programmable query builder. Each `.from(table)` call pulls
// the next queued result for that table from a per-table queue.
const queues: Record<string, unknown[]> = {};
function enqueue(table: string, result: unknown) {
  (queues[table] ??= []).push(result);
}
function makeBuilder(table: string) {
  const result = (queues[table] ?? []).shift() ?? { data: null, error: null };
  const b: Record<string, unknown> = {};
  const passthrough = [
    "select", "eq", "neq", "in", "is", "not", "gte", "lte", "order", "limit",
    "update", "insert", "delete",
  ];
  for (const m of passthrough) b[m] = vi.fn(() => b);
  b.single = vi.fn(async () => result);
  b.maybeSingle = vi.fn(async () => result);
  // Awaiting the builder directly (e.g. delete().eq()) resolves to result.
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}
const fromMock = vi.fn((table: string) => makeBuilder(table));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: fromMock })),
}));

import {
  isBookingV2Enabled,
  bookingUid,
  newBookingToken,
  replaceWeeklyTemplate,
  cancelBooking,
  acceptProposedTime,
  isTimeWithinTemplate,
  createProposalAppointments,
} from "@/lib/booking-v2";
import type { BookingSlotTemplateRow } from "@/lib/booking-v2/types";

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(queues)) delete queues[k];
  isFlagEnabledMock.mockResolvedValue(false);
  sendEmailMock.mockResolvedValue({ ok: true });
});

describe("isBookingV2Enabled", () => {
  it("delegates to isFlagEnabled with the booking_v2 key and advisor segment", async () => {
    isFlagEnabledMock.mockResolvedValueOnce(true);
    await expect(isBookingV2Enabled("a@b.com")).resolves.toBe(true);
    expect(isFlagEnabledMock).toHaveBeenCalledWith("booking_v2", {
      userKey: "a@b.com",
      segment: "advisor",
    });
  });

  it("fails closed when the flag is off", async () => {
    isFlagEnabledMock.mockResolvedValueOnce(false);
    await expect(isBookingV2Enabled()).resolves.toBe(false);
  });
});

describe("bookingUid / newBookingToken", () => {
  it("derives a stable UID from the booking id", () => {
    expect(bookingUid(42)).toBe("advisor-booking-42@invest.com.au");
  });
  it("mints a 48-char hex token", () => {
    const t = newBookingToken();
    expect(t).toMatch(/^[0-9a-f]{48}$/);
    expect(newBookingToken()).not.toBe(t);
  });
});

describe("replaceWeeklyTemplate", () => {
  it("rejects an invalid day_of_week without touching the DB", async () => {
    const r = await replaceWeeklyTemplate(1, [
      { dayOfWeek: 9 as 6, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 30 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid_day_of_week");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("rejects an end-before-start window", async () => {
    const r = await replaceWeeklyTemplate(1, [
      { dayOfWeek: 1, startTime: "10:00", endTime: "09:00", slotDurationMinutes: 30 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid_time_range");
  });

  it("rejects an out-of-range slot duration", async () => {
    const r = await replaceWeeklyTemplate(1, [
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 3 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid_duration");
  });

  it("deletes then inserts and flips booking_enabled when rows are active", async () => {
    enqueue("advisor_booking_slots", { error: null }); // delete
    enqueue("advisor_booking_slots", { data: [{ id: 1 }, { id: 2 }], error: null }); // insert
    enqueue("professionals", { error: null }); // booking_enabled update
    const r = await replaceWeeklyTemplate(7, [
      { dayOfWeek: 1, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 30 },
      { dayOfWeek: 2, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 30 },
    ]);
    expect(r.ok).toBe(true);
    expect(r.count).toBe(2);
  });

  it("clears the template (no rows) and disables booking", async () => {
    enqueue("advisor_booking_slots", { error: null }); // delete
    enqueue("professionals", { error: null }); // booking_enabled=false update
    const r = await replaceWeeklyTemplate(7, []);
    expect(r.ok).toBe(true);
    expect(r.count).toBe(0);
  });

  it("surfaces a delete failure", async () => {
    enqueue("advisor_booking_slots", { error: { message: "boom" } });
    const r = await replaceWeeklyTemplate(7, []);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("delete_failed");
  });
});

describe("cancelBooking", () => {
  const baseBooking = {
    id: 5,
    professional_id: 3,
    investor_name: "Bob",
    investor_email: "bob@x.com",
    investor_phone: null,
    booking_date: "2026-06-13",
    booking_time: "14:00:00",
    duration_minutes: 30,
    topic: null,
    status: "confirmed",
    booking_tz: "Australia/Sydney",
    starts_at_utc: "2026-06-13T04:00:00.000Z",
    reschedule_token: "tok",
  };

  it("returns not_found when the booking is missing", async () => {
    enqueue("advisor_bookings", { data: null });
    const r = await cancelBooking(5, "reason");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("not_found");
  });

  it("is idempotent for an already-cancelled booking (no email)", async () => {
    enqueue("advisor_bookings", { data: { ...baseBooking, status: "cancelled" } });
    const r = await cancelBooking(5, "reason");
    expect(r.ok).toBe(true);
    expect(r.alreadyCancelled).toBe(true);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("cancels a confirmed booking and emails both parties with a CANCEL invite", async () => {
    enqueue("advisor_bookings", { data: baseBooking }); // initial read
    enqueue("advisor_bookings", { error: null }); // update
    enqueue("professionals", { data: { name: "Jane", email: "jane@firm.com" } }); // pro
    const r = await cancelBooking(5, "consumer_cancelled");
    expect(r.ok).toBe(true);
    // Consumer + advisor = 2 sends.
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    // Both carry a CANCEL .ics attachment.
    const calls = sendEmailMock.mock.calls as unknown as Array<
      [{ attachments?: { content: string }[] }]
    >;
    for (const call of calls) {
      const opts = call[0];
      expect(opts.attachments?.[0]).toBeTruthy();
      const decoded = Buffer.from(opts.attachments![0]!.content, "base64").toString("utf8");
      expect(decoded).toContain("METHOD:CANCEL");
      expect(decoded).toContain("UID:advisor-booking-5@invest.com.au");
    }
  });
});

describe("acceptProposedTime", () => {
  it("claims an open slot and cancels siblings", async () => {
    enqueue("advisor_booking_appointments", { data: { id: 11 }, error: null }); // claim
    enqueue("advisor_booking_appointments", { error: null }); // sibling cancel
    const r = await acceptProposedTime({
      appointmentId: 11,
      siblingIds: [11, 12, 13],
      bookedByEmail: "Bob@X.com",
      bookedByName: "Bob",
    });
    expect(r.ok).toBe(true);
  });

  it("returns already_taken when the slot is no longer open", async () => {
    enqueue("advisor_booking_appointments", { data: null, error: null }); // claim → nothing updated
    const r = await acceptProposedTime({
      appointmentId: 11,
      siblingIds: [11],
      bookedByEmail: "bob@x.com",
      bookedByName: "Bob",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("already_taken");
  });
});

describe("createProposalAppointments", () => {
  it("rejects fewer than 1 or more than 3 slots", async () => {
    const none = await createProposalAppointments({ professionalId: 1, slots: [] });
    expect(none.ok).toBe(false);
    expect(none.error).toBe("slot_count_out_of_range");
  });

  it("rejects a past slot", async () => {
    const r = await createProposalAppointments({
      professionalId: 1,
      slots: [{ startsAt: "2000-01-01T00:00:00.000Z", durationMinutes: 30 }],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("slot_in_past");
  });

  it("creates rows for valid future slots", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    enqueue("advisor_booking_appointments", {
      data: { id: 21, starts_at: future, ends_at: future },
      error: null,
    });
    const r = await createProposalAppointments({
      professionalId: 1,
      slots: [{ startsAt: future, durationMinutes: 30 }],
    });
    expect(r.ok).toBe(true);
    expect(r.created).toHaveLength(1);
    expect(r.created[0]!.id).toBe(21);
  });
});

describe("isTimeWithinTemplate", () => {
  const template: BookingSlotTemplateRow[] = [
    {
      id: 1,
      professional_id: 1,
      day_of_week: 6, // Saturday
      start_time: "09:00:00",
      end_time: "11:00:00",
      slot_duration_minutes: 30,
      is_active: true,
    },
  ];

  it("accepts an on-grid time inside an active window", () => {
    // 2026-06-13 is a Saturday.
    expect(isTimeWithinTemplate("2026-06-13", "09:30:00", "Australia/Sydney", template)).toBe(true);
  });

  it("rejects an off-grid time", () => {
    expect(isTimeWithinTemplate("2026-06-13", "09:15:00", "Australia/Sydney", template)).toBe(false);
  });

  it("rejects a time on the wrong day", () => {
    // 2026-06-14 is a Sunday → no window.
    expect(isTimeWithinTemplate("2026-06-14", "09:30:00", "Australia/Sydney", template)).toBe(false);
  });

  it("rejects a slot that would overrun the window end", () => {
    expect(isTimeWithinTemplate("2026-06-13", "10:45:00", "Australia/Sydney", template)).toBe(false);
  });

  it("ignores inactive windows", () => {
    const inactive = template.map((r) => ({ ...r, is_active: false }));
    expect(isTimeWithinTemplate("2026-06-13", "09:30:00", "Australia/Sydney", inactive)).toBe(false);
  });
});
