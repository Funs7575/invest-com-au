import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockIsRateLimited = vi.fn();
const mockGetAdminEmails = vi.fn();
const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => mockGetAdminEmails(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/broker-outreach/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = "admin@invest.com.au";
const ADMIN_USER = { id: "admin-1", email: ADMIN_EMAIL };

const VALID_BODY = {
  to_email: "contact@commsec.com.au",
  to_name: "Alex Broker",
  broker_name: "CommSec",
  broker_slug: "commsec",
};

function makePost(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/broker-outreach", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function makeInsertChain(result = { error: null }) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn().mockResolvedValue(result);
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/broker-outreach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockGetAdminEmails.mockReturnValue([ADMIN_EMAIL]);
    mockIsRateLimited.mockResolvedValue(false);
    mockSupabaseFrom.mockReturnValue(makeInsertChain());
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    process.env.RESEND_API_KEY = "test-resend-key";
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user is not admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "other@example.com" } }, error: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 when to_email is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, to_email: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when to_name is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, to_name: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when broker_name is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, broker_name: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when to_email is invalid format", async () => {
    const res = await POST(makePost({ ...VALID_BODY, to_email: "not-an-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid email/i);
  });

  it("returns 500 when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("returns 502 when Resend API returns non-ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "validation error",
    });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toMatch(/email send failed/i);
  });

  it("returns 200 and logs send to broker_outreach_log on success", async () => {
    const insertChain = makeInsertChain();
    mockSupabaseFrom.mockReturnValue(insertChain);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockSupabaseFrom).toHaveBeenCalledWith("broker_outreach_log");
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        broker_name: "CommSec",
        contact_email: "contact@commsec.com.au",
        contact_name: "Alex Broker",
        broker_slug: "commsec",
      }),
    );
  });

  it("includes broker review URL with slug in email HTML", async () => {
    await POST(makePost(VALID_BODY));
    const fetchBody = JSON.parse(mockFetch.mock.calls[0]![1].body as string);
    expect(fetchBody.html).toContain("invest.com.au/broker/commsec");
  });

  it("uses brokers index URL when no broker_slug provided", async () => {
    await POST(makePost({ ...VALID_BODY, broker_slug: undefined }));
    const fetchBody = JSON.parse(mockFetch.mock.calls[0]![1].body as string);
    expect(fetchBody.html).toContain("invest.com.au/brokers");
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    mockFetch.mockRejectedValue(new Error("network failure"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
