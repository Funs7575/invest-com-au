import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSupabaseFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET } from "@/app/api/consultation/bookings/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: "user-123" };
const BOOKING = {
  id: 1,
  user_id: "user-123",
  consultation_id: 42,
  status: "confirmed",
  booked_at: "2026-04-01T10:00:00Z",
};

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/consultation/bookings");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function maybySingleChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.in = vi.fn(() => c);
  c.order = vi.fn(() => c);
  c.limit = vi.fn(() => c);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/consultation/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: USER } });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet({ consultation_id: "42" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when consultation_id is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/consultation_id/i);
  });

  it("returns booking when found", async () => {
    mockSupabaseFrom.mockReturnValue(maybySingleChain({ data: BOOKING, error: null }));
    const res = await GET(makeGet({ consultation_id: "42" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.booking).toMatchObject({ id: 1, status: "confirmed" });
  });

  it("returns null booking when no matching record", async () => {
    mockSupabaseFrom.mockReturnValue(maybySingleChain({ data: null, error: null }));
    const res = await GET(makeGet({ consultation_id: "99" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.booking).toBeNull();
  });

  it("filters by user_id and consultation_id", async () => {
    const chain = maybySingleChain({ data: null, error: null });
    mockSupabaseFrom.mockReturnValue(chain);
    await GET(makeGet({ consultation_id: "42" }));
    expect(chain.eq).toHaveBeenCalledWith("user_id", USER.id);
    expect(chain.eq).toHaveBeenCalledWith("consultation_id", 42);
  });

  it("only returns pending/confirmed/completed bookings", async () => {
    const chain = maybySingleChain({ data: null, error: null });
    mockSupabaseFrom.mockReturnValue(chain);
    await GET(makeGet({ consultation_id: "42" }));
    expect(chain.in).toHaveBeenCalledWith("status", ["pending", "confirmed", "completed"]);
  });

  it("returns 500 when supabase throws", async () => {
    mockGetUser.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeGet({ consultation_id: "42" }));
    expect(res.status).toBe(500);
  });
});
