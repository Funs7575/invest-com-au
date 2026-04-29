import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
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

import { GET, POST, DELETE } from "@/app/api/admin/bd-pipeline/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupAuth(email: string | null = "admin@test.com") {
  mockGetUser.mockResolvedValue({
    data: { user: email ? { email } : null },
    error: email ? null : { message: "no session" },
  });
}

const PIPELINE_ROWS = [
  { id: 1, company_name: "Acme Brokers", status: "contacted", updated_at: "2026-01-01" },
  { id: 2, company_name: "Beta Finance", status: "negotiating", updated_at: "2026-01-02" },
];

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/bd-pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDelete(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/bd-pipeline", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupFromMock(opts: {
  rows?: typeof PIPELINE_ROWS;
  singleData?: Record<string, unknown> | null;
  singleError?: { message: string } | null;
  deleteThrows?: boolean;
} = {}) {
  const { rows = PIPELINE_ROWS, singleData = null, singleError = null } = opts;

  mockFrom.mockImplementation((table: string) => {
    if (table === "bd_pipeline") {
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: rows }),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(singleError ? { error: singleError } : { data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: singleData, error: singleError }),
      };
    }
    if (table === "admin_audit_log") {
      return {
        insert: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((cb: (v: { error: null }) => void) => cb({ error: null })),
      };
    }
    return {};
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/bd-pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    setupFromMock();
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when user is not in ADMIN_EMAILS", async () => {
    setupAuth("other@test.com");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with pipeline rows", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);
    expect(json[0].company_name).toBe("Acme Brokers");
  });

  it("returns 500 on DB throw", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("DB gone");
    });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/admin/bd-pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);
    const res = await POST(makePost({ company_name: "Test" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when company_name is missing", async () => {
    setupFromMock();
    const res = await POST(makePost({ status: "contacted" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/company_name/);
  });

  it("creates new entry when no id provided", async () => {
    setupFromMock({ singleData: { id: 3, company_name: "New Co" } });
    const res = await POST(makePost({ company_name: "New Co", status: "prospect" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.company_name).toBe("New Co");
  });

  it("returns 500 on insert DB error", async () => {
    setupFromMock({ singleData: null, singleError: { message: "insert failed" } });
    const res = await POST(makePost({ company_name: "Fail Co" }));
    expect(res.status).toBe(500);
  });

  it("updates existing entry when id is provided", async () => {
    setupFromMock({ singleData: { id: 1, company_name: "Updated Co" } });
    const res = await POST(makePost({ id: 1, company_name: "Updated Co", status: "negotiating" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.company_name).toBe("Updated Co");
  });
});

describe("DELETE /api/admin/bd-pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    setupFromMock();
  });

  it("returns 401 when not authenticated", async () => {
    setupAuth(null);
    const res = await DELETE(makeDelete({ id: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    const res = await DELETE(makeDelete({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/id required/);
  });

  it("returns 200 with deleted: true on success", async () => {
    const res = await DELETE(makeDelete({ id: 1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
  });
});
