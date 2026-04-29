import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@test.com"],
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST, DELETE } from "@/app/api/admin/regulatory-impacts/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_USER = { email: "admin@test.com" };
const ANON_USER = null;

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/regulatory-impacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_POST = {
  alert_id: 1,
  broker_slug: "commsec",
  impact_level: "high",
  impact_description: "Significant fee changes expected",
};

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/admin/regulatory-impacts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ANON_USER } });
    const req = new NextRequest("http://localhost/api/admin/regulatory-impacts?alert_id=1");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when alert_id is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const req = new NextRequest("http://localhost/api/admin/regulatory-impacts");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns impacts for alert_id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 1, broker_slug: "commsec", impact_level: "high" }], error: null }),
    });
    const req = new NextRequest("http://localhost/api/admin/regulatory-impacts?alert_id=42");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("returns 500 on DB error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "db_error" } }),
    });
    const req = new NextRequest("http://localhost/api/admin/regulatory-impacts?alert_id=1");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/admin/regulatory-impacts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ANON_USER } });
    const res = await POST(makePost(VALID_POST));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await POST(makePost({ alert_id: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid impact_level", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await POST(makePost({ ...VALID_POST, impact_level: "catastrophic" }));
    expect(res.status).toBe(400);
  });

  it("upserts impact, updates alert slugs, writes audit log", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const impactData = { id: 10, ...VALID_POST };

    // Call order: upsert impact, fetch all slugs, update alert, insert audit
    mockFrom
      .mockReturnValueOnce({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: impactData, error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ broker_slug: "commsec" }] }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

    const res = await POST(makePost(VALID_POST));
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });

  it("returns 500 on upsert DB error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFrom.mockReturnValueOnce({
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "conflict" } }),
    });
    const res = await POST(makePost(VALID_POST));
    expect(res.status).toBe(500);
  });

  it("accepts all valid impact_level values", async () => {
    for (const level of ["none", "low", "medium", "high", "critical"]) {
      vi.clearAllMocks();
      mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
      mockFrom
        .mockReturnValueOnce({
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 1, impact_level: level }, error: null }),
        })
        .mockReturnValueOnce({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [] }) })
        .mockReturnValueOnce({ update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) })
        .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: null }) });
      const res = await POST(makePost({ ...VALID_POST, impact_level: level }));
      expect(res.status).toBe(200);
    }
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe("DELETE /api/admin/regulatory-impacts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ANON_USER } });
    const req = new NextRequest("http://localhost/api/admin/regulatory-impacts?id=1");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when id query param is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const req = new NextRequest("http://localhost/api/admin/regulatory-impacts");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("deletes impact and writes audit log", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom
      .mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      .mockReturnValueOnce({ insert: auditInsert });
    const req = new NextRequest("http://localhost/api/admin/regulatory-impacts?id=42");
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "regulatory_impact:deleted", entity_id: "42" })
    );
  });
});
