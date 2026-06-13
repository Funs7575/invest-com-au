import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const isAllowedMock = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: isAllowedMock, ipKey: () => "ip" }));

const getByRescheduleTokenMock = vi.hoisted(() =>
  vi.fn<() => Promise<unknown>>(),
);
const isBookingV2EnabledMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>(async () => true));
const cancelBookingMock = vi.hoisted(() =>
  vi.fn<() => Promise<{ ok: boolean; error?: string; alreadyCancelled?: boolean }>>(
    async () => ({ ok: true }),
  ),
);
const rescheduleBookingMock = vi.hoisted(() =>
  vi.fn<
    () => Promise<{
      ok: boolean;
      error?: string;
      newBookingId?: number;
      rescheduleToken?: string;
    }>
  >(async () => ({ ok: true, newBookingId: 12, rescheduleToken: "newtok" })),
);
vi.mock("@/lib/booking-v2", () => ({
  getBookingByRescheduleToken: getByRescheduleTokenMock,
  isBookingV2Enabled: isBookingV2EnabledMock,
  cancelBooking: cancelBookingMock,
  rescheduleBooking: rescheduleBookingMock,
}));

import { POST as cancelPOST } from "@/app/api/booking/[token]/cancel/route";
import { POST as reschedulePOST } from "@/app/api/booking/[token]/reschedule/route";

const TOKEN = "a".repeat(48);
const ctx = { params: Promise.resolve({ token: TOKEN }) };

function jsonReq(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const BOOKING = { id: 5, status: "confirmed", reschedule_token: TOKEN };

beforeEach(() => {
  vi.clearAllMocks();
  isAllowedMock.mockResolvedValue(true);
  isBookingV2EnabledMock.mockResolvedValue(true);
  getByRescheduleTokenMock.mockResolvedValue(BOOKING);
  cancelBookingMock.mockResolvedValue({ ok: true });
  rescheduleBookingMock.mockResolvedValue({ ok: true, newBookingId: 12, rescheduleToken: "newtok" });
});

describe("POST /api/booking/[token]/cancel", () => {
  it("404s for an unknown token", async () => {
    getByRescheduleTokenMock.mockResolvedValueOnce(null);
    const res = await cancelPOST(jsonReq("http://x/api/booking/t/cancel", {}), ctx);
    expect(res.status).toBe(404);
  });

  it("403s when the flag is off", async () => {
    isBookingV2EnabledMock.mockResolvedValueOnce(false);
    const res = await cancelPOST(jsonReq("http://x/api/booking/t/cancel", {}), ctx);
    expect(res.status).toBe(403);
    expect(cancelBookingMock).not.toHaveBeenCalled();
  });

  it("cancels and returns ok", async () => {
    const res = await cancelPOST(
      jsonReq("http://x/api/booking/t/cancel", { reason: "changed plans" }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(cancelBookingMock).toHaveBeenCalledWith(5, "changed plans");
  });

  it("reports alreadyCancelled", async () => {
    cancelBookingMock.mockResolvedValueOnce({ ok: true, alreadyCancelled: true });
    const res = await cancelPOST(jsonReq("http://x/api/booking/t/cancel", {}), ctx);
    expect((await res.json()).alreadyCancelled).toBe(true);
  });
});

describe("POST /api/booking/[token]/reschedule", () => {
  it("400s on an invalid body", async () => {
    const res = await reschedulePOST(
      jsonReq("http://x/api/booking/t/reschedule", { date: "nope", time: "bad" }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("404s for an unknown token", async () => {
    getByRescheduleTokenMock.mockResolvedValueOnce(null);
    const res = await reschedulePOST(
      jsonReq("http://x/api/booking/t/reschedule", { date: "2026-06-13", time: "14:00" }),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it("403s when the flag is off", async () => {
    isBookingV2EnabledMock.mockResolvedValueOnce(false);
    const res = await reschedulePOST(
      jsonReq("http://x/api/booking/t/reschedule", { date: "2026-06-13", time: "14:00" }),
      ctx,
    );
    expect(res.status).toBe(403);
    expect(rescheduleBookingMock).not.toHaveBeenCalled();
  });

  it("409s when the target time is taken", async () => {
    rescheduleBookingMock.mockResolvedValueOnce({ ok: false, error: "already_taken" });
    const res = await reschedulePOST(
      jsonReq("http://x/api/booking/t/reschedule", { date: "2026-06-13", time: "14:00" }),
      ctx,
    );
    expect(res.status).toBe(409);
  });

  it("reschedules and returns the new token", async () => {
    const res = await reschedulePOST(
      jsonReq("http://x/api/booking/t/reschedule", { date: "2026-06-13", time: "14:00" }),
      ctx,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.newBookingId).toBe(12);
    expect(json.rescheduleToken).toBe("newtok");
    expect(rescheduleBookingMock).toHaveBeenCalledWith({
      bookingId: 5,
      newDate: "2026-06-13",
      newTime: "14:00",
    });
  });
});
