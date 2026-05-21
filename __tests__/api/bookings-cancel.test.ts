import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { ConsultationError } = vi.hoisted(() => {
  class ConsultationError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return { ConsultationError };
});

const {
  mockIsAllowed,
  mockRequireAdvisorSession,
  mockGetUser,
  mockGetBooking,
  mockGetSlot,
  mockCancelBooking,
  mockAdminInsert,
  mockAdminFrom,
} = vi.hoisted(() => {
  const mockAdminInsert = vi.fn();
  return {
    mockIsAllowed: vi.fn(),
    mockRequireAdvisorSession: vi.fn(),
    mockGetUser: vi.fn(),
    mockGetBooking: vi.fn(),
    mockGetSlot: vi.fn(),
    mockCancelBooking: vi.fn(),
    mockAdminInsert,
    mockAdminFrom: vi.fn(() => ({ insert: mockAdminInsert })),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/consultations", () => ({
  ConsultationError,
  getBooking: mockGetBooking,
  getSlot: mockGetSlot,
  cancelBooking: mockCancelBooking,
}));

import { POST } from "@/app/api/bookings/[id]/cancel/route";

const BOOKING = {
  id: 7,
  slot_id: 11,
  brief_id: 99,
  consumer_email: "consumer@example.com",
};
const SLOT = { id: 11, professional_id: "pro-1", start_at: "x", end_at: "y" };

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/bookings/7/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = (id = "7") => ({ params: Promise.resolve({ id }) });

describe("POST /api/bookings/[id]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockAdminInsert.mockResolvedValue({ error: null });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(429);
  });

  it("returns 400 on a non-numeric booking id", async () => {
    const res = await POST(makeReq({}), ctx("abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid booking id." });
  });

  it("returns 400 on a malformed body (bad email)", async () => {
    const res = await POST(makeReq({ contact_email: "not-an-email" }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when the booking is not found", async () => {
    mockGetBooking.mockResolvedValueOnce(null);
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Booking not found." });
  });

  it("returns 404 when the slot is not found", async () => {
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce(null);
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Slot not found." });
  });

  it("returns 403 when no party can be authorised", async () => {
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce(SLOT);
    const res = await POST(makeReq({ contact_email: "stranger@example.com" }), ctx());
    expect(res.status).toBe(403);
  });

  it("cancels as the professional when their session matches the slot", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce("pro-1");
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce(SLOT);
    mockCancelBooking.mockResolvedValueOnce({ ...BOOKING, status: "cancelled" });
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
    expect(mockCancelBooking).toHaveBeenCalledWith(7, "professional");
  });

  it("cancels as the consumer via matching contact_email", async () => {
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce(SLOT);
    mockCancelBooking.mockResolvedValueOnce({ ...BOOKING, status: "cancelled" });
    const res = await POST(makeReq({ contact_email: "Consumer@Example.com" }), ctx());
    expect(res.status).toBe(200);
    expect(mockCancelBooking).toHaveBeenCalledWith(7, "consumer");
  });

  it("cancels as the consumer via a matching signed-in session", async () => {
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce(SLOT);
    mockGetUser.mockResolvedValueOnce({ data: { user: { email: "consumer@example.com" } } });
    mockCancelBooking.mockResolvedValueOnce({ ...BOOKING, status: "cancelled" });
    const res = await POST(makeReq(), ctx());
    expect(res.status).toBe(200);
    expect(mockCancelBooking).toHaveBeenCalledWith(7, "consumer");
  });

  it("still succeeds when the tracker-event insert throws (best effort)", async () => {
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce(SLOT);
    mockCancelBooking.mockResolvedValueOnce({ ...BOOKING, status: "cancelled" });
    mockAdminInsert.mockRejectedValueOnce(new Error("insert boom"));
    const res = await POST(makeReq({ contact_email: "consumer@example.com" }), ctx());
    expect(res.status).toBe(200);
  });

  it("maps a ConsultationError to its status + code", async () => {
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce(SLOT);
    mockCancelBooking.mockRejectedValueOnce(
      new ConsultationError("booking_not_found", "gone", 409),
    );
    const res = await POST(makeReq({ contact_email: "consumer@example.com" }), ctx());
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "gone", code: "booking_not_found" });
  });

  it("returns 500 on an unexpected error", async () => {
    mockGetBooking.mockRejectedValueOnce(new Error("kaboom"));
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to cancel booking." });
  });
});
