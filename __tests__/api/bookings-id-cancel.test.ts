import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockRequireAdvisorSession = vi.fn(async () => null);

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

const mockGetUser = vi.fn(async () => ({
  data: { user: null },
  error: null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
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

const mockIsAllowed = vi.fn(async () => true);

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockGetBooking = vi.fn(async () => null);
const mockGetSlot = vi.fn(async () => null);
const mockCancelBooking = vi.fn(async () => ({ id: 1, status: "cancelled" }));

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
  cancelBooking: (...args: unknown[]) => mockCancelBooking(...args),
  ConsultationError: MockConsultationError,
  getBooking: (...args: unknown[]) => mockGetBooking(...args),
  getSlot: (...args: unknown[]) => mockGetSlot(...args),
}));

import { POST } from "@/app/api/bookings/[id]/cancel/route";

function makeReq(id: string, body?: unknown): NextRequest {
  const url = `http://localhost/api/bookings/${id}/cancel`;
  return new NextRequest(url, {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

const mockBooking = {
  id: 1,
  slot_id: 10,
  brief_id: 100,
  consumer_email: "user@example.com",
  status: "pending",
};
const mockSlot = {
  id: 10,
  professional_id: 42,
  start_at: "2024-06-01T10:00:00Z",
  end_at: "2024-06-01T11:00:00Z",
};

describe("/api/bookings/[id]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockIsAllowed.mockResolvedValue(true);
    mockGetBooking.mockResolvedValue(null);
    mockGetSlot.mockResolvedValue(null);
    mockCancelBooking.mockResolvedValue({ id: 1, status: "cancelled" });
    mockAdminFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq("1"), { params: Promise.resolve({ id: "1" }) } as never);
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid booking id (non-numeric)", async () => {
    const res = await POST(makeReq("abc"), { params: Promise.resolve({ id: "abc" }) } as never);
    expect(res.status).toBe(400);
  });

  it("returns 404 when booking not found", async () => {
    mockGetBooking.mockResolvedValue(null);
    const res = await POST(makeReq("999"), { params: Promise.resolve({ id: "999" }) } as never);
    expect(res.status).toBe(404);
  });

  it("returns 404 when slot not found", async () => {
    mockGetBooking.mockResolvedValue(mockBooking);
    mockGetSlot.mockResolvedValue(null);
    const res = await POST(makeReq("1"), { params: Promise.resolve({ id: "1" }) } as never);
    expect(res.status).toBe(404);
  });

  it("returns 403 when caller is not authorised", async () => {
    mockGetBooking.mockResolvedValue(mockBooking);
    mockGetSlot.mockResolvedValue(mockSlot);
    // No advisor session, no auth user, no contact_email
    const res = await POST(makeReq("1"), { params: Promise.resolve({ id: "1" }) } as never);
    expect(res.status).toBe(403);
  });

  it("cancels booking when consumer provides matching email", async () => {
    mockGetBooking.mockResolvedValue(mockBooking);
    mockGetSlot.mockResolvedValue(mockSlot);
    const res = await POST(
      makeReq("1", { contact_email: "user@example.com" }),
      { params: Promise.resolve({ id: "1" }) } as never,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("cancels booking when advisor session matches slot", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42); // slot.professional_id = 42
    mockGetBooking.mockResolvedValue(mockBooking);
    mockGetSlot.mockResolvedValue(mockSlot);
    const res = await POST(makeReq("1"), { params: Promise.resolve({ id: "1" }) } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("cancels booking when signed-in user email matches consumer_email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
    mockGetBooking.mockResolvedValue(mockBooking);
    mockGetSlot.mockResolvedValue(mockSlot);
    const res = await POST(makeReq("1"), { params: Promise.resolve({ id: "1" }) } as never);
    expect(res.status).toBe(200);
  });
});
