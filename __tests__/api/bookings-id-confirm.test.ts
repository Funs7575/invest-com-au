import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockRequireAdvisorSession = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 42);

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockGetBooking = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null);
const mockGetSlot = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null);
const mockConfirmBooking = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  id: 1,
  status: "confirmed",
  consumer_email: "user@example.com",
  brief_id: 100,
  meet_url: null,
}));

const { MockConsultationError } = vi.hoisted(() => {
  class MockConsultationError extends Error {
    code: string;
    status: number;
    constructor(message: string, code: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
      this.name = "ConsultationError";
    }
  }
  return { MockConsultationError };
});

vi.mock("@/lib/consultations", () => ({
  confirmBooking: (...args: unknown[]) => mockConfirmBooking(...args),
  ConsultationError: MockConsultationError,
  getBooking: (...args: unknown[]) => mockGetBooking(...args),
  getSlot: (...args: unknown[]) => mockGetSlot(...args),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockAdminFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

vi.mock("@/lib/marketplace-emails", () => ({
  sendConsumerConsultationConfirmed: vi.fn(async () => {}),
}));

import { POST } from "@/app/api/bookings/[id]/confirm/route";

function makeReq(id: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/bookings/${id}/confirm`, {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

const mockSlot = {
  id: 10,
  professional_id: 42,
  start_at: "2024-06-01T10:00:00Z",
  end_at: "2024-06-01T11:00:00Z",
};
const mockBooking = {
  id: 1,
  slot_id: 10,
  brief_id: 100,
  consumer_email: "user@example.com",
  status: "pending",
  meet_url: null,
};

describe("/api/bookings/[id]/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockIsAllowed.mockResolvedValue(true);
    mockGetBooking.mockResolvedValue(mockBooking);
    mockGetSlot.mockResolvedValue(mockSlot);
    mockConfirmBooking.mockResolvedValue({
      id: 1,
      status: "confirmed",
      consumer_email: "user@example.com",
      brief_id: 100,
      meet_url: null,
    });
    mockAdminFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq("1"), { params: Promise.resolve({ id: "1" }) } as never);
    expect(res.status).toBe(429);
  });

  it("rejects unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq("1"), { params: Promise.resolve({ id: "1" }) } as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid booking id", async () => {
    const res = await POST(makeReq("abc"), { params: Promise.resolve({ id: "abc" }) } as never);
    expect(res.status).toBe(400);
  });

  it("returns 404 when booking not found", async () => {
    mockGetBooking.mockResolvedValue(null);
    const res = await POST(makeReq("999"), { params: Promise.resolve({ id: "999" }) } as never);
    expect(res.status).toBe(404);
  });

  it("returns 404 when slot not found", async () => {
    mockGetSlot.mockResolvedValue(null);
    const res = await POST(makeReq("1"), { params: Promise.resolve({ id: "1" }) } as never);
    expect(res.status).toBe(404);
  });

  it("returns 403 when slot belongs to different advisor", async () => {
    mockGetSlot.mockResolvedValue({ ...mockSlot, professional_id: 99 });
    const res = await POST(makeReq("1"), { params: Promise.resolve({ id: "1" }) } as never);
    expect(res.status).toBe(403);
  });

  it("confirms booking successfully", async () => {
    const res = await POST(makeReq("1"), { params: Promise.resolve({ id: "1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json).toHaveProperty("booking");
  });

  it("confirms booking with meet_url", async () => {
    const res = await POST(
      makeReq("1", { meet_url: "https://meet.example.com/abc" }),
      { params: Promise.resolve({ id: "1" }) } as never,
    );
    expect(res.status).toBe(200);
  });
});
