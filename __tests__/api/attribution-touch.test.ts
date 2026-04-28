import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
}));

const mockRecordTouch = vi.fn();
vi.mock("@/lib/attribution", () => ({
  recordTouch: (...args: unknown[]) => mockRecordTouch(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST } from "@/app/api/attribution/touch/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, opts: { ip?: string; referer?: string } = {}): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": opts.ip ?? "1.2.3.4",
  };
  if (opts.referer) headers.referer = opts.referer;
  return new NextRequest("http://localhost/api/attribution/touch", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  session_id: "sess-xyz",
  event: "view",
  source: "organic",
  medium: "search",
  campaign: "summer",
  landing_path: "/smsf",
  page_path: "/smsf/auditors",
  vertical: "smsf",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/attribution/touch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRecordTouch.mockResolvedValue(true);
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("returns 400 when session_id is missing", async () => {
    const { session_id: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/session_id/i);
    expect(mockRecordTouch).not.toHaveBeenCalled();
  });

  it("returns 400 when event is missing", async () => {
    const { event: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/event/i);
  });

  it("returns 400 when event value is not in allowed list", async () => {
    const res = await POST(makePost({ ...VALID_BODY, event: "hover" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid event/i);
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockRecordTouch).not.toHaveBeenCalled();
  });

  // ── Allowed event values ──────────────────────────────────────────────────

  it.each(["view", "click", "signup", "lead", "conversion"])(
    "accepts event='%s'",
    async (event) => {
      const res = await POST(makePost({ ...VALID_BODY, event }));
      expect(res.status).toBe(200);
    },
  );

  // ── Success path ──────────────────────────────────────────────────────────

  it("returns 200 with ok=true on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("passes all optional fields to recordTouch", async () => {
    await POST(makePost(VALID_BODY));
    const input = mockRecordTouch.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(input.sessionId).toBe("sess-xyz");
    expect(input.event).toBe("view");
    expect(input.source).toBe("organic");
    expect(input.medium).toBe("search");
    expect(input.campaign).toBe("summer");
    expect(input.landingPath).toBe("/smsf");
    expect(input.pagePath).toBe("/smsf/auditors");
    expect(input.vertical).toBe("smsf");
  });

  it("sets optional string fields to null when absent", async () => {
    await POST(makePost({ session_id: "s", event: "view" }));
    const input = mockRecordTouch.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(input.source).toBeNull();
    expect(input.medium).toBeNull();
    expect(input.campaign).toBeNull();
    expect(input.landingPath).toBeNull();
    expect(input.pagePath).toBeNull();
    expect(input.vertical).toBeNull();
    expect(input.userKey).toBeNull();
    expect(input.valueCents).toBeNull();
  });

  it("passes value_cents when provided as a number", async () => {
    await POST(makePost({ ...VALID_BODY, value_cents: 5000 }));
    const input = mockRecordTouch.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(input.valueCents).toBe(5000);
  });

  it("passes hasReferer=true when Referer header is set", async () => {
    await POST(makePost(VALID_BODY, { referer: "https://google.com" }));
    const hasReferer = mockRecordTouch.mock.calls[0]?.[2];
    expect(hasReferer).toBe(true);
  });

  it("passes hasReferer=false when Referer header is absent", async () => {
    await POST(makePost(VALID_BODY));
    const hasReferer = mockRecordTouch.mock.calls[0]?.[2];
    expect(hasReferer).toBe(false);
  });

  // ── Error path ────────────────────────────────────────────────────────────

  it("returns 500 when recordTouch returns false", async () => {
    mockRecordTouch.mockResolvedValue(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("insert_failed");
  });
});
