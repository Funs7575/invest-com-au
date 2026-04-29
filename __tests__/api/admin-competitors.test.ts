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

import { GET, POST, DELETE } from "@/app/api/admin/competitors/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_USER = { email: "admin@test.com" };
const ANON_USER = null;

const ENTRIES = [
  {
    id: 1,
    competitor: "fin.com.au",
    event_type: "new_product",
    title: "New ETF hub",
    detail: null,
    url: null,
    spotted_at: "2026-04-01T00:00:00Z",
  },
];

function makeRequest(method: "POST" | "DELETE", body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/competitors", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/admin/competitors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ANON_USER }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with entries list on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: ENTRIES }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].competitor).toBe("fin.com.au");
  });

  it("returns empty array when no entries (null data)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns 500 when DB throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error("db_thrown")),
    });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/admin/competitors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ANON_USER }, error: null });
    const res = await POST(
      makeRequest("POST", { competitor: "rival.com", event_type: "launch", title: "Test" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when competitor is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(makeRequest("POST", { event_type: "launch", title: "Test" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when event_type is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(makeRequest("POST", { competitor: "rival.com", title: "Test" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is empty/whitespace", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(
      makeRequest("POST", { competitor: "rival.com", event_type: "launch", title: "   " })
    );
    expect(res.status).toBe(400);
  });

  it("creates entry and writes audit log on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const newEntry = { id: 2, competitor: "rival.com", event_type: "launch", title: "New Launch" };
    const auditInsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "competitor_watch") {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: newEntry, error: null }),
        };
      }
      return { insert: auditInsertMock };
    });
    const res = await POST(
      makeRequest("POST", { competitor: "rival.com", event_type: "launch", title: "New Launch" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(2);
    expect(auditInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "competitor_watch:created" })
    );
  });

  it("returns 500 on DB insert error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "competitor_watch") {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "insert_failed" } }),
        };
      }
      return {};
    });
    const res = await POST(
      makeRequest("POST", { competitor: "rival.com", event_type: "launch", title: "Test" })
    );
    expect(res.status).toBe(500);
  });

  it("includes optional detail and url in insert", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const capturedInsert = vi.fn().mockReturnThis();
    mockFrom.mockImplementation((table: string) => {
      if (table === "competitor_watch") {
        return {
          insert: capturedInsert,
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 3, competitor: "rival.com", event_type: "launch", title: "Test" },
            error: null,
          }),
        };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });
    await POST(
      makeRequest("POST", {
        competitor: "rival.com",
        event_type: "launch",
        title: "Test",
        detail: "some detail",
        url: "https://rival.com/news",
      })
    );
    expect(capturedInsert).toHaveBeenCalledWith(
      expect.objectContaining({ detail: "some detail", url: "https://rival.com/news" })
    );
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe("DELETE /api/admin/competitors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ANON_USER }, error: null });
    const res = await DELETE(makeRequest("DELETE", { id: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await DELETE(makeRequest("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("deletes entry and writes audit log", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const auditInsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "competitor_watch") {
        return {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return { insert: auditInsertMock };
    });
    const res = await DELETE(makeRequest("DELETE", { id: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
    expect(auditInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "competitor_watch:deleted", entity_id: "1" })
    );
  });
});
