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

const ADMIN_USER = { email: "admin@test.com", id: "uid-1" };

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

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/competitors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDelete(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/competitors", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupListMock(data: unknown[] = ENTRIES) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data }),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET ────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/competitors", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when not admin email", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "stranger@example.com" } },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns competitor entries on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    setupListMock();
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(ENTRIES);
  });

  it("returns empty array when no entries (null data)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null }),
    };
    mockFrom.mockReturnValue(chain);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it("returns 500 when DB throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error("connection error")),
    };
    mockFrom.mockReturnValue(chain);
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ── POST ───────────────────────────────────────────────────────────────────────

describe("POST /api/admin/competitors", () => {
  it("returns 401 when not admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePost({ competitor: "rival.com", event_type: "launch", title: "T" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when competitor is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(makePost({ event_type: "launch", title: "Test" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when event_type is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(makePost({ competitor: "rival.com", title: "Test" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is empty/whitespace", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(
      makePost({ competitor: "rival.com", event_type: "launch", title: "   " }),
    );
    expect(res.status).toBe(400);
  });

  it("inserts entry and writes audit log", async () => {
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
      makePost({ competitor: "rival.com", event_type: "launch", title: "New Launch" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe(2);
    expect(auditInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "competitor_watch:created" }),
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
      makePost({ competitor: "rival.com", event_type: "launch", title: "Test" }),
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
      makePost({
        competitor: "rival.com",
        event_type: "launch",
        title: "Test",
        detail: "some detail",
        url: "https://rival.com/news",
      }),
    );
    expect(capturedInsert).toHaveBeenCalledWith(
      expect.objectContaining({ detail: "some detail", url: "https://rival.com/news" }),
    );
  });
});

// ── DELETE ─────────────────────────────────────────────────────────────────────

describe("DELETE /api/admin/competitors", () => {
  it("returns 401 when not admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(makeDelete({ id: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const chain = { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({}) };
    const auditChain = { insert: vi.fn().mockResolvedValue({}) };
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? chain : auditChain;
    });
    const res = await DELETE(makeDelete({}));
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
    const res = await DELETE(makeDelete({ id: 1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deleted).toBe(true);
    expect(auditInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "competitor_watch:deleted", entity_id: "1" }),
    );
  });
});
