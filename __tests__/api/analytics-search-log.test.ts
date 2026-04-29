import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockIpKey = vi.fn((req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown");

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => mockIpKey(req),
}));

const mockLogSearchQuery = vi.fn();
const mockIsValidSurface = vi.fn();

vi.mock("@/lib/search-analytics", () => ({
  logSearchQuery: (...args: unknown[]) => mockLogSearchQuery(...args),
  isValidSurface: (v: unknown) => mockIsValidSurface(v),
}));

import { POST } from "@/app/api/analytics/search-log/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/analytics/search-log", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: body !== undefined ? JSON.stringify(body) : "not-json",
  });
}

function makeValidBody(overrides = {}) {
  return { query: "best etf broker", surface: "global", ...overrides };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/analytics/search-log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockIsValidSurface.mockReturnValue(true);
    mockLogSearchQuery.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toMatch(/rate_limited/i);
  });

  it("returns 400 when query is missing", async () => {
    const res = await POST(makeRequest({ surface: "global" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid_request/i);
  });

  it("returns 400 when query is not a string", async () => {
    const res = await POST(makeRequest({ query: 42, surface: "global" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when surface is invalid", async () => {
    mockIsValidSurface.mockReturnValue(false);
    const res = await POST(makeRequest({ query: "etf broker", surface: "bad_surface" }));
    expect(res.status).toBe(400);
    expect(mockIsValidSurface).toHaveBeenCalledWith("bad_surface");
  });

  it("returns 200 ok:true when log succeeds", async () => {
    mockLogSearchQuery.mockResolvedValue(true);
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("returns 200 ok:false when logSearchQuery returns false", async () => {
    mockLogSearchQuery.mockResolvedValue(false);
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it("passes optional fields to logSearchQuery", async () => {
    const body = makeValidBody({
      result_count: 12,
      result_clicked: true,
      clicked_rank: 3,
      session_id: "sess-abc",
    });
    await POST(makeRequest(body));
    expect(mockLogSearchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        resultCount: 12,
        resultClicked: true,
        clickedRank: 3,
        sessionId: "sess-abc",
      }),
    );
  });

  it("treats invalid JSON body as empty object (no crash)", async () => {
    const req = new NextRequest("http://localhost/api/analytics/search-log", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-valid-json",
    });
    const res = await POST(req);
    // Missing query → 400 (not a 500)
    expect(res.status).toBe(400);
  });
});
