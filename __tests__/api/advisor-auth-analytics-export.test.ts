import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockIsRateLimited, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 7),
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockAdminFrom: vi.fn<(...args: unknown[]) => unknown>(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/advisor-auth/analytics/export/route";

// ── Builder helper ────────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

function makeGet(searchParams = "") {
  return new NextRequest(
    `http://localhost/api/advisor-auth/analytics/export${searchParams ? `?${searchParams}` : ""}`,
    { method: "GET" },
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/analytics/export — auth + rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(7);
  });

  it("returns 401 when requireAdvisorSession returns null", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not authenticated/i);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/too many requests/i);
  });
});

describe("GET /api/advisor-auth/analytics/export — DB error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(7);
  });

  it("returns 500 when DB query fails", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "db error" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/failed to fetch/i);
  });
});

describe("GET /api/advisor-auth/analytics/export — CSV output", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(7);
  });

  it("returns 200 with text/csv content-type when no leads exist", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([], null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    const text = await res.text();
    expect(text).toContain("Date,Client,Source,Status,Billed (AUD),Notes");
  });

  it("includes one data row per lead with masked client name", async () => {
    mockAdminFrom.mockReturnValue(
      makeBuilder(
        [
          {
            created_at: "2025-03-15T10:00:00.000Z",
            user_name: "John Smith",
            source_page: "/brokers",
            status: "contacted",
            bill_amount_cents: 4900,
            advisor_notes: "Interested",
          },
        ],
        null,
      ),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const text = await res.text();
    const lines = text.split("\r\n");
    // Header + 1 data row
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const dataLine = lines[1] ?? "";
    // Date should be present
    expect(dataLine).toContain("2025-03-15");
    // Client name masked: "J. S****"
    expect(dataLine).toContain("J. S****");
    // Billed as dollars
    expect(dataLine).toContain("49.00");
    // Status
    expect(dataLine).toContain("contacted");
  });

  it("uses filename with 'all-time' label when period=all", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([], null));
    const res = await GET(makeGet("period=all"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("all-time");
  });

  it("uses filename with '90d' label when period=90d", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([], null));
    const res = await GET(makeGet("period=90d"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("90d");
  });

  it("applies gte filter for 30d period and not for all period", async () => {
    const builder = makeBuilder([], null);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet("period=30d"));
    // gte should have been called (cutoff set for 30d)
    expect(builder.gte).toHaveBeenCalled();
  });

  it("does not apply gte filter for all period", async () => {
    const builder = makeBuilder([], null);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet("period=all"));
    // gte should NOT have been called (no cutoff for 'all')
    expect(builder.gte).not.toHaveBeenCalled();
  });

  it("sets Cache-Control: no-store", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([], null));
    const res = await GET(makeGet());
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("CSV-escapes cells that contain commas", async () => {
    mockAdminFrom.mockReturnValue(
      makeBuilder(
        [
          {
            created_at: "2025-01-01T00:00:00.000Z",
            user_name: "Alice",
            source_page: null,
            status: "new",
            bill_amount_cents: 0,
            advisor_notes: "Fee: $1,000",
          },
        ],
        null,
      ),
    );
    const res = await GET(makeGet());
    const text = await res.text();
    // The note with a comma must be wrapped in quotes
    expect(text).toContain('"Fee: $1,000"');
  });

  it("masks a single-name client correctly (no last name)", async () => {
    mockAdminFrom.mockReturnValue(
      makeBuilder(
        [
          {
            created_at: "2025-01-01T00:00:00.000Z",
            user_name: "Madonna",
            source_page: null,
            status: "new",
            bill_amount_cents: 0,
            advisor_notes: null,
          },
        ],
        null,
      ),
    );
    const res = await GET(makeGet());
    const text = await res.text();
    // Single name → "M****"
    expect(text).toContain("M****");
  });
});
