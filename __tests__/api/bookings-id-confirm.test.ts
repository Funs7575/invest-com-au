import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: () => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(),
}));
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

const {
  confirmBookingMock,
  getBookingMock,
  getSlotMock,
  ConsultationError,
} = vi.hoisted(() => {
  class ConsultationError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    confirmBookingMock: vi.fn(),
    getBookingMock: vi.fn(),
    getSlotMock: vi.fn(),
    ConsultationError,
  };
});
vi.mock("@/lib/consultations", () => ({
  confirmBooking: (...a: unknown[]) => confirmBookingMock(...a),
  getBooking: (...a: unknown[]) => getBookingMock(...a),
  getSlot: (...a: unknown[]) => getSlotMock(...a),
  ConsultationError,
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const sendConfirmedMock = vi.fn();
vi.mock("@/lib/marketplace-emails", () => ({
  sendConsumerConsultationConfirmed: (...a: unknown[]) => sendConfirmedMock(...a),
}));

import { POST } from "@/app/api/bookings/[id]/confirm/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(
  id = "5",
  body?: unknown,
  ip = "1.2.3.4",
): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/bookings/${id}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ id }) }];
}

const ADVISOR_ID = 42;
const BOOKING = { id: 5, slot_id: 9, brief_id: 55, consumer_email: "c@example.com", meet_url: null };
const SLOT = { id: 9, professional_id: ADVISOR_ID, start_at: "2026-06-01T10:00:00Z", end_at: "2026-06-01T11:00:00Z" };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/bookings/[id]/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    getBookingMock.mockResolvedValue(BOOKING);
    getSlotMock.mockResolvedValue(SLOT);
    confirmBookingMock.mockResolvedValue({ ...BOOKING, status: "confirmed" });
    sendConfirmedMock.mockResolvedValue(undefined);
    // The fire-and-forget email looks up the brief + pro via the admin client.
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "advisor_auctions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { slug: "job-abc", job_title: "Tax help", contact_name: "Jo" },
            error: null,
          }),
        };
      }
      if (table === "professionals") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Pat Pro" }, error: null }),
        };
      }
      return {};
    });
  });

  it("returns 429 when rate limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 401 when not signed in", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-numeric booking id", async () => {
    const [req, ctx] = makeReq("abc");
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid booking id/i);
  });

  it("returns 400 when meet_url is not a valid url", async () => {
    const [req, ctx] = makeReq("5", { meet_url: "not-a-url" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect(confirmBookingMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the booking is not found", async () => {
    getBookingMock.mockResolvedValueOnce(null);
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/booking not found/i);
  });

  it("returns 404 when the slot is not found", async () => {
    getSlotMock.mockResolvedValueOnce(null);
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/slot not found/i);
  });

  it("returns 403 when the slot belongs to another pro", async () => {
    getSlotMock.mockResolvedValueOnce({ ...SLOT, professional_id: 999 });
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
    expect(confirmBookingMock).not.toHaveBeenCalled();
  });

  it("confirms the booking and returns 200 (optional empty body is tolerated)", async () => {
    const [req, ctx] = makeReq("5"); // no body
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.booking.status).toBe("confirmed");
    expect(confirmBookingMock).toHaveBeenCalledWith(5, { meetUrl: null });
  });

  it("forwards a provided meet_url to confirmBooking", async () => {
    const url = "https://meet.example.com/abc";
    const [req, ctx] = makeReq("5", { meet_url: url });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    expect(confirmBookingMock).toHaveBeenCalledWith(5, { meetUrl: url });
  });

  it("maps a ConsultationError to its own status code", async () => {
    confirmBookingMock.mockRejectedValueOnce(
      new ConsultationError("slot_not_open", "Slot is not open.", 409),
    );
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("slot_not_open");
  });

  it("returns 500 on an unexpected error", async () => {
    confirmBookingMock.mockRejectedValueOnce(new Error("boom"));
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to confirm booking/i);
  });
});
