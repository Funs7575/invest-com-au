import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET } from "@/app/api/consultation/bookings/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_ID = "user-abc";

function makeGet(consultationId?: string): NextRequest {
  const url = `http://localhost/api/consultation/bookings${consultationId !== undefined ? `?consultation_id=${encodeURIComponent(consultationId)}` : ""}`;
  return new NextRequest(url);
}

function makeBookingBuilder(data: unknown = null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error })),
  };
}

function makeBooking(overrides = {}) {
  return {
    id: 1,
    user_id: USER_ID,
    consultation_id: 42,
    status: "confirmed",
    booked_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/consultation/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(makeGet("42"));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/authenticated/i);
  });

  it("returns 400 when consultation_id is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/consultation_id/i);
  });

  it("returns booking when found", async () => {
    const booking = makeBooking();
    mockServerFrom.mockReturnValue(makeBookingBuilder(booking));
    const res = await GET(makeGet("42"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.booking.id).toBe(1);
    expect(data.booking.status).toBe("confirmed");
  });

  it("returns null booking when no booking exists", async () => {
    mockServerFrom.mockReturnValue(makeBookingBuilder(null));
    const res = await GET(makeGet("42"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.booking).toBeNull();
  });

  it("filters by user_id and consultation_id", async () => {
    const builder = makeBookingBuilder(makeBooking());
    mockServerFrom.mockReturnValue(builder);
    await GET(makeGet("42"));
    expect(builder.eq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(builder.eq).toHaveBeenCalledWith("consultation_id", 42);
  });

  it("only returns non-cancelled statuses", async () => {
    const builder = makeBookingBuilder(makeBooking());
    mockServerFrom.mockReturnValue(builder);
    await GET(makeGet("42"));
    expect(builder.in).toHaveBeenCalledWith("status", ["pending", "confirmed", "completed"]);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetUser.mockRejectedValue(new Error("connection refused"));
    const res = await GET(makeGet("42"));
    expect(res.status).toBe(500);
  });
});
