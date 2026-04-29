import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsAllowed = vi.fn();
const mockIpKey = vi.fn((req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown");

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => mockIpKey(req),
}));

import { POST } from "@/app/api/csp-report/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeInsertBuilder(error: unknown = null) {
  return {
    insert: vi.fn(() => Promise.resolve({ error })),
  };
}

function makeRequest(
  body: unknown,
  contentType = "application/csp-report",
): NextRequest {
  return new NextRequest("http://localhost/api/csp-report", {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "x-forwarded-for": "1.2.3.4",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const LEGACY_REPORT = {
  "csp-report": {
    "document-uri": "https://invest.com.au/brokers",
    "blocked-uri": "https://evil.com/script.js",
    "violated-directive": "script-src",
    "status-code": 200,
  },
};

const REPORTING_API_REPORT = [
  {
    type: "csp-violation",
    body: {
      "document-uri": "https://invest.com.au/compare",
      "blocked-uri": "https://evil.com/img.png",
      "violated-directive": "img-src",
    },
  },
];

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/csp-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockAdminFrom.mockReturnValue(makeInsertBuilder());
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeRequest(LEGACY_REPORT));
    expect(res.status).toBe(429);
  });

  it("returns 204 and inserts legacy csp-report format", async () => {
    const builder = makeInsertBuilder();
    mockAdminFrom.mockReturnValue(builder);
    const res = await POST(makeRequest(LEGACY_REPORT));
    expect(res.status).toBe(204);
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        blocked_uri: "https://evil.com/script.js",
        violated_directive: "script-src",
      }),
    );
  });

  it("returns 204 and inserts Reporting API v1 format", async () => {
    const builder = makeInsertBuilder();
    mockAdminFrom.mockReturnValue(builder);
    const res = await POST(makeRequest(REPORTING_API_REPORT, "application/reports+json"));
    expect(res.status).toBe(204);
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        blocked_uri: "https://evil.com/img.png",
        violated_directive: "img-src",
      }),
    );
  });

  it("returns 204 on unparseable body without crashing", async () => {
    const res = await POST(makeRequest("not json", "application/csp-report"));
    expect(res.status).toBe(204);
  });

  it("still returns 204 when DB insert fails", async () => {
    mockAdminFrom.mockReturnValue(makeInsertBuilder({ message: "insert error" }));
    const res = await POST(makeRequest(LEGACY_REPORT));
    expect(res.status).toBe(204);
  });

  it("stores user_agent header value", async () => {
    const req = new NextRequest("http://localhost/api/csp-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/csp-report",
        "x-forwarded-for": "1.2.3.4",
        "user-agent": "Mozilla/5.0",
      },
      body: JSON.stringify(LEGACY_REPORT),
    });
    const builder = makeInsertBuilder();
    mockAdminFrom.mockReturnValue(builder);
    await POST(req);
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_agent: "Mozilla/5.0" }),
    );
  });
});
