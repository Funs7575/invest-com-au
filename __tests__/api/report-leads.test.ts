import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const mockIsRateLimited = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (..._args: unknown[]) => mockIsRateLimited(),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/report-leads/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_BODY = {
  report_slug: "lithium-2026",
  email: "investor@example.com",
  name: "Jane Investor",
};

function makeReq(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/report-leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const REPORT = {
  slug: "lithium-2026",
  report_url: "https://cdn.example.com/lithium-2026.pdf",
  gated: true,
  status: "published",
};

/** Build a chainable admin mock keyed per table. */
function makeAdmin({
  report = REPORT as Record<string, unknown> | null,
  reportErr = null as { message: string } | null,
  insertErr = null as { message: string } | null,
}: {
  report?: Record<string, unknown> | null;
  reportErr?: { message: string } | null;
  insertErr?: { message: string } | null;
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "sector_reports") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: report, error: reportErr }),
      };
    }
    if (table === "developer_leads") {
      return {
        insert: vi.fn().mockResolvedValue({ error: insertErr }),
      };
    }
    return {};
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/report-leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    makeAdmin();
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
    expect((await res.json()).success).toBe(false);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(makeReq("not-json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("returns 400 with an email-specific message for a bad email", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, email: "nope" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid email");
  });

  it("returns 400 when name is too short", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, name: "x" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid name");
  });

  it("returns 404 when the report slug is unknown", async () => {
    makeAdmin({ report: null });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/unknown report/i);
  });

  it("returns 500 when the lead insert fails", async () => {
    makeAdmin({ insertErr: { message: "insert failed" } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/database error/i);
  });

  it("returns 200 with the report_url on success", async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.report_url).toBe(REPORT.report_url);
  });
});
