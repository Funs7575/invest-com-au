import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "test-ip"),
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
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom, rpc: vi.fn(() => makeBuilder()) })),
}));

const mockGetUser = vi.fn(async () => ({ data: { user: { id: "u1", email: "consumer@test.com" } }, error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => makeBuilder()),
  })),
}));

const mockGetSlot = vi.fn(async () => null);
const mockBookSlot = vi.fn(async () => ({
  booking: { id: 1 },
  slot: { id: 10, start_at: "2026-06-01T09:00:00Z", end_at: "2026-06-01T10:00:00Z" },
}));

vi.mock("@/lib/consultations", () => ({
  bookSlot: (...args: unknown[]) => mockBookSlot(...args),
  getSlot: (...args: unknown[]) => mockGetSlot(...args),
  ConsultationError: class ConsultationError extends Error {
    status: number;
    code: string;
    constructor(msg: string, status = 400, code = "error") {
      super(msg);
      this.status = status;
      this.code = code;
    }
  },
}));

vi.mock("@/lib/marketplace-emails", () => ({
  sendProConsultationBooked: vi.fn(async () => {}),
  sendConsumerConsultationPending: vi.fn(async () => {}),
}));

import { POST } from "@/app/api/briefs/[slug]/book-slot/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/briefs/x/book-slot", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

function makeCtx(slug = "x") {
  return { params: Promise.resolve({ slug }) } as { params: Promise<{ slug: string }> };
}

const validBrief = {
  id: 1,
  slug: "x",
  job_title: "Test Brief",
  contact_email: "consumer@test.com",
  contact_name: "Consumer",
  accepted_by_professional_id: 42,
  accepted_by_team_id: null,
};

describe("/api/briefs/[slug]/book-slot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "consumer@test.com" } }, error: null });
    mockAdminFrom.mockReturnValue(makeBuilder({ data: validBrief, error: null }));
    mockGetSlot.mockResolvedValue({ id: 10, professional_id: 42, start_at: "2026-06-01T09:00:00Z", end_at: "2026-06-01T10:00:00Z" });
    mockBookSlot.mockResolvedValue({
      booking: { id: 1 },
      slot: { id: 10, start_at: "2026-06-01T09:00:00Z", end_at: "2026-06-01T10:00:00Z" },
    });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ slot_id: 10 }), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 400 when body is not valid JSON (no body)", async () => {
    const req = new Request("http://localhost/api/briefs/x/book-slot", { method: "POST" }) as unknown as NextRequest;
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when slot_id missing", async () => {
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when brief not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq({ slot_id: 10 }), makeCtx("notfound"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when brief not yet accepted", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({
      data: { ...validBrief, accepted_by_professional_id: null },
      error: null,
    }));
    const res = await POST(makeReq({ slot_id: 10 }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 401 when no user session and no contact_email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq({ slot_id: 10 }), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 403 when contact_email does not match brief", async () => {
    const res = await POST(makeReq({ slot_id: 10, contact_email: "other@test.com" }), makeCtx());
    expect(res.status).toBe(403);
  });

  it("returns 404 when slot not found", async () => {
    mockGetSlot.mockResolvedValue(null);
    const res = await POST(makeReq({ slot_id: 10, contact_email: "consumer@test.com" }), makeCtx());
    expect(res.status).toBe(404);
  });

  it("returns 200 on happy path via contact_email", async () => {
    const res = await POST(makeReq({ slot_id: 10, contact_email: "consumer@test.com" }), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
