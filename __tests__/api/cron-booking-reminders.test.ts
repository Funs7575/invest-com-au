import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// Cron auth — return null (authorised) by default.
const requireCronAuthMock = vi.hoisted(() => vi.fn(() => null));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: requireCronAuthMock }));

const isBookingV2EnabledMock = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/lib/booking-v2", () => ({
  isBookingV2Enabled: isBookingV2EnabledMock,
  DEFAULT_BOOKING_TZ: "Australia/Sydney",
}));

// time helper used for the human-readable when string.
vi.mock("@/lib/booking-v2/time", () => ({
  formatBookingForHumans: () => "Saturday, 13 June 2026 at 2:00 PM",
}));

const sendEmailMock = vi.hoisted(() => vi.fn(async () => ({ ok: true })));
vi.mock("@/lib/resend", () => ({ sendEmail: sendEmailMock }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));

const isSuppressedMock = vi.hoisted(() => vi.fn(async () => false));
vi.mock("@/lib/email-suppression", () => ({ isSuppressed: isSuppressedMock }));

const dispatchPushMock = vi.hoisted(() =>
  vi.fn(async () => ({ sent: 0, failed: 0, skipped_no_sub: true, stale_removed: 0 })),
);
vi.mock("@/lib/push-dispatch", () => ({ dispatchPushToUser: dispatchPushMock }));

const buildEmailMapMock = vi.hoisted(() => vi.fn(async () => new Map<string, string>()));
vi.mock("@/lib/notifications", () => ({ buildEmailToUserIdMap: buildEmailMapMock }));

// Admin client — programmable per-table queues (same pattern as booking-v2 test).
const queues: Record<string, unknown[]> = {};
function enqueue(table: string, result: unknown) {
  (queues[table] ??= []).push(result);
}
function makeBuilder(table: string) {
  const result = (queues[table] ?? []).shift() ?? { data: null, error: null };
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "neq", "in", "is", "not", "gte", "lte", "order", "limit", "update", "insert"]) {
    b[m] = vi.fn(() => b);
  }
  b.single = vi.fn(async () => result);
  b.maybeSingle = vi.fn(async () => result);
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}
const fromMock = vi.fn((table: string) => makeBuilder(table));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: fromMock })),
}));

import { GET } from "@/app/api/cron/booking-reminders/route";

function req(): NextRequest {
  return new NextRequest("http://localhost/api/cron/booking-reminders");
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(queues)) delete queues[k];
  requireCronAuthMock.mockReturnValue(null);
  isBookingV2EnabledMock.mockResolvedValue(true);
  isSuppressedMock.mockResolvedValue(false);
  sendEmailMock.mockResolvedValue({ ok: true });
  buildEmailMapMock.mockResolvedValue(new Map());
});

describe("GET /api/cron/booking-reminders", () => {
  it("returns the cron-auth response when unauthorised", async () => {
    const resp = new Response("no", { status: 401 });
    requireCronAuthMock.mockReturnValueOnce(resp as unknown as null);
    const out = await GET(req());
    expect(out.status).toBe(401);
  });

  it("no-ops when the booking_v2 flag is off (fail-closed)", async () => {
    isBookingV2EnabledMock.mockResolvedValueOnce(false);
    const out = await GET(req());
    expect(out.status).toBe(200);
    expect((await out.json()).skipped).toBe("flag_off");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("sends a 24h reminder for a due booking and stamps it idempotently", async () => {
    const booking = {
      id: 9,
      professional_id: 3,
      investor_name: "Bob",
      investor_email: "bob@x.com",
      booking_date: "2026-06-13",
      booking_time: "14:00:00",
      starts_at_utc: "2026-06-13T04:00:00.000Z",
      booking_tz: "Australia/Sydney",
      reschedule_token: "tok",
      status: "confirmed",
    };
    // 24h fetch returns one booking; 1h fetch returns none.
    enqueue("advisor_bookings", { data: [booking], error: null }); // due24
    enqueue("advisor_bookings", { data: [], error: null }); // due1
    // The claim update (compare-and-set) succeeds.
    enqueue("advisor_bookings", { data: { id: 9 }, error: null }); // claim
    enqueue("professionals", { data: { name: "Jane" } }); // advisor name

    const out = await GET(req());
    const json = await out.json();
    expect(out.status).toBe(200);
    expect(json.sent24).toBe(1);
    expect(json.sent1).toBe(0);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("does not send when the claim is lost (already reminded this window)", async () => {
    const booking = {
      id: 9,
      professional_id: 3,
      investor_name: "Bob",
      investor_email: "bob@x.com",
      starts_at_utc: "2026-06-13T04:00:00.000Z",
      booking_tz: "Australia/Sydney",
      reschedule_token: "tok",
      status: "confirmed",
    };
    enqueue("advisor_bookings", { data: [booking], error: null }); // due24
    enqueue("advisor_bookings", { data: [], error: null }); // due1
    enqueue("advisor_bookings", { data: null, error: null }); // claim → nothing updated

    const out = await GET(req());
    const json = await out.json();
    expect(json.sent24).toBe(0);
    expect(json.skipped).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("skips suppressed recipients (after claiming)", async () => {
    isSuppressedMock.mockResolvedValueOnce(true);
    const booking = {
      id: 9,
      professional_id: 3,
      investor_name: "Bob",
      investor_email: "bob@x.com",
      starts_at_utc: "2026-06-13T04:00:00.000Z",
      booking_tz: "Australia/Sydney",
      reschedule_token: "tok",
      status: "confirmed",
    };
    enqueue("advisor_bookings", { data: [booking], error: null }); // due24
    enqueue("advisor_bookings", { data: [], error: null }); // due1
    enqueue("advisor_bookings", { data: { id: 9 }, error: null }); // claim ok

    const out = await GET(req());
    const json = await out.json();
    expect(json.sent24).toBe(0);
    expect(json.skipped).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
