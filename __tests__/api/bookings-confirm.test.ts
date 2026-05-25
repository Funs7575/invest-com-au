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
  mockGetBooking,
  mockGetSlot,
  mockConfirmBooking,
  mockSendEmail,
  mockAdminFrom,
} = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockRequireAdvisorSession: vi.fn(),
  mockGetBooking: vi.fn(),
  mockGetSlot: vi.fn(),
  mockConfirmBooking: vi.fn(),
  mockSendEmail: vi.fn(),
  mockAdminFrom: vi.fn(),
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
  confirmBooking: mockConfirmBooking,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/marketplace-emails", () => ({
  sendConsumerConsultationConfirmed: mockSendEmail,
}));

import { POST } from "@/app/api/bookings/[id]/confirm/route";

const BOOKING = {
  id: 7,
  slot_id: 11,
  brief_id: 99,
  consumer_email: "consumer@example.com",
  meet_url: null,
};
const SLOT = { id: 11, professional_id: "pro-1", start_at: "x", end_at: "y" };

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/bookings/7/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = (id = "7") => ({ params: Promise.resolve({ id }) });

// admin.from().select().eq().maybeSingle()
function makeMaybeSingleChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("POST /api/bookings/[id]/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue("pro-1");
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(429);
  });

  it("returns 401 when there is no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in required." });
  });

  it("returns 400 on a non-numeric booking id", async () => {
    const res = await POST(makeReq({}), ctx("nope"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid booking id." });
  });

  it("returns 400 on a malformed body (bad meet_url)", async () => {
    const res = await POST(makeReq({ meet_url: "not a url" }), ctx());
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

  it("returns 403 when the slot belongs to another professional", async () => {
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce({ ...SLOT, professional_id: "someone-else" });
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Not your booking." });
  });

  it("happy path: confirms the booking and returns it", async () => {
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce(SLOT);
    const confirmed = { ...BOOKING, status: "confirmed", meet_url: "https://meet.example.com/x" };
    mockConfirmBooking.mockResolvedValueOnce(confirmed);
    // brief lookup returns no slug -> skips email branch
    mockAdminFrom.mockReturnValue(makeMaybeSingleChain({ data: null }));
    const res = await POST(makeReq({ meet_url: "https://meet.example.com/x" }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
    expect(mockConfirmBooking).toHaveBeenCalledWith(7, { meetUrl: "https://meet.example.com/x" });
  });

  it("passes meetUrl null when no meet_url is supplied", async () => {
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce(SLOT);
    mockConfirmBooking.mockResolvedValueOnce({ ...BOOKING, status: "confirmed" });
    mockAdminFrom.mockReturnValue(makeMaybeSingleChain({ data: null }));
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(200);
    expect(mockConfirmBooking).toHaveBeenCalledWith(7, { meetUrl: null });
  });

  it("sends the consumer email when the brief has a slug (best effort)", async () => {
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce(SLOT);
    mockConfirmBooking.mockResolvedValueOnce({ ...BOOKING, status: "confirmed", meet_url: null });
    mockAdminFrom
      .mockReturnValueOnce(makeMaybeSingleChain({ data: { slug: "my-brief", job_title: "Job", contact_name: "Bob" } }))
      .mockReturnValueOnce(makeMaybeSingleChain({ data: { name: "Pro Name" } }));
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(200);
    // email dispatch is fire-and-forget; let the microtask flush
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ consumerEmail: "consumer@example.com", briefSlug: "my-brief" }),
    );
  });

  it("maps a ConsultationError to its status + code", async () => {
    mockGetBooking.mockResolvedValueOnce(BOOKING);
    mockGetSlot.mockResolvedValueOnce(SLOT);
    mockConfirmBooking.mockRejectedValueOnce(
      new ConsultationError("slot_not_open", "already confirmed", 409),
    );
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "already confirmed", code: "slot_not_open" });
  });

  it("returns 500 on an unexpected error", async () => {
    mockGetBooking.mockRejectedValueOnce(new Error("kaboom"));
    const res = await POST(makeReq({}), ctx());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to confirm booking." });
  });
});
