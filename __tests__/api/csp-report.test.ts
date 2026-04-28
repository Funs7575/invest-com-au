import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockInsert, mockAdminFrom, mockIsAllowed, mockIpKey, mockLog } =
  vi.hoisted(() => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockAdminFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockIsAllowed = vi.fn().mockResolvedValue(true);
    const mockIpKey = vi.fn().mockReturnValue("ip:1.2.3.4");
    const mockLog = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };
    return { mockInsert, mockAdminFrom, mockIsAllowed, mockIpKey, mockLog };
  });

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: mockIpKey,
}));
vi.mock("@/lib/logger", () => ({ logger: () => mockLog }));

import { POST } from "@/app/api/csp-report/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: string, contentType = "application/csp-report"): NextRequest {
  return new NextRequest("http://localhost/api/csp-report", {
    method: "POST",
    body,
    headers: {
      "Content-Type": contentType,
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "Mozilla/5.0 Test",
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockInsert.mockResolvedValue({ error: null });
  mockAdminFrom.mockReturnValue({ insert: mockInsert });
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/csp-report", () => {
  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(429);
  });

  it("returns 204 for unparseable body", async () => {
    const res = await POST(makeRequest("not-json"));
    expect(res.status).toBe(204);
  });

  it("returns 204 for empty body", async () => {
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(204);
  });

  it("handles legacy application/csp-report format and inserts to DB", async () => {
    const report = {
      "csp-report": {
        "document-uri": "https://invest.com.au/quiz",
        "blocked-uri": "inline",
        "violated-directive": "script-src",
        "effective-directive": "script-src-elem",
        "status-code": 0,
        "source-file": "https://invest.com.au/quiz",
        "line-number": 42,
        "column-number": 7,
      },
    };
    const res = await POST(makeRequest(JSON.stringify(report)));
    expect(res.status).toBe(204);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        document_uri: "https://invest.com.au/quiz",
        blocked_uri: "inline",
        violated_directive: "script-src",
      }),
    );
  });

  it("handles Reporting API v1 format (application/reports+json array)", async () => {
    const reports = [
      {
        type: "csp-violation",
        body: {
          "blocked-uri": "https://evil.example.com/script.js",
          "violated-directive": "script-src",
          "effective-directive": "script-src-elem",
        },
      },
    ];
    const res = await POST(
      makeRequest(JSON.stringify(reports), "application/reports+json"),
    );
    expect(res.status).toBe(204);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        blocked_uri: "https://evil.example.com/script.js",
        violated_directive: "script-src",
      }),
    );
  });

  it("returns 204 even when DB insert fails (browser should not retry on error)", async () => {
    mockInsert.mockResolvedValue({ error: { message: "DB down" } });
    const report = { "csp-report": { "blocked-uri": "inline" } };
    const res = await POST(makeRequest(JSON.stringify(report)));
    expect(res.status).toBe(204);
    expect(mockLog.warn).toHaveBeenCalled();
  });

  it("stores user-agent from request header", async () => {
    const report = { "csp-report": { "blocked-uri": "data:" } };
    await POST(makeRequest(JSON.stringify(report)));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_agent: "Mozilla/5.0 Test" }),
    );
  });

  it("stores null fields when csp-report body keys are absent", async () => {
    const report = { "csp-report": {} };
    await POST(makeRequest(JSON.stringify(report)));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        document_uri: null,
        blocked_uri: null,
        violated_directive: null,
      }),
    );
  });
});
