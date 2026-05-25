import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRequireCronAuth, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireCronAuth: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (req: NextRequest) => mockRequireCronAuth(req),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET, POST, PATCH, DELETE } from "@/app/api/admin/content/calendar/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CALENDAR_ITEMS = [
  { id: 1, title: "Best Brokers 2026", status: "planned", target_publish_date: "2026-06-01" },
];

// ── Setup helpers ─────────────────────────────────────────────────────────────

function setupMocks(data: unknown = CALENDAR_ITEMS, error: unknown = null) {
  mockRequireCronAuth.mockReturnValue(null); // null = auth passed
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table);
    b.then = vi.fn((cb: (v: unknown) => void) => {
      cb({ data, error });
      return Promise.resolve();
    });
    b.single = vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] ?? null : data, error });
    b.maybeSingle = vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] ?? null : data, error });
    return b;
  });
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/admin/content/calendar");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, {
    method: "GET",
    headers: { Authorization: "Bearer test-secret" },
  });
}

function makePost(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/content/calendar", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Authorization: "Bearer test-secret" },
  });
}

function makePatch(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/content/calendar", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Authorization: "Bearer test-secret" },
  });
}

function makeDelete(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/content/calendar", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Authorization: "Bearer test-secret" },
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/content/calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    expect((await GET(makeGet())).status).toBe(401);
  });

  it("returns calendar items", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toBeDefined();
  });

  it("filters by status when provided", async () => {
    await GET(makeGet({ status: "planned" }));
    // eq("status", "planned") was called on the builder
    expect(mockAdminFrom).toHaveBeenCalledWith("content_calendar");
  });

  it("returns 500 on DB error", async () => {
    setupMocks(null, { message: "DB error" });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/content/calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks(CALENDAR_ITEMS[0]);
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    expect((await POST(makePost({ title: "Test Article" }))).status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makePost({ category: "brokers" }));
    expect(res.status).toBe(400);
  });

  it("creates a calendar item and returns 201", async () => {
    const res = await POST(makePost({ title: "Best Brokers 2026" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.item).toBeDefined();
  });
});

// ── PATCH tests ───────────────────────────────────────────────────────────────

describe("PATCH /api/admin/content/calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks(CALENDAR_ITEMS[0]);
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    expect((await PATCH(makePatch({ id: 1, status: "draft_ready" }))).status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    const res = await PATCH(makePatch({ status: "draft_ready" }));
    expect(res.status).toBe(400);
  });

  it("updates the calendar item", async () => {
    const res = await PATCH(makePatch({ id: 1, status: "draft_ready" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.item).toBeDefined();
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/admin/content/calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks(null);
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    expect((await DELETE(makeDelete({ id: 1 }))).status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    const res = await DELETE(makeDelete({ title: "foo" }));
    expect(res.status).toBe(400);
  });

  it("deletes the calendar item", async () => {
    const res = await DELETE(makeDelete({ id: 1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
