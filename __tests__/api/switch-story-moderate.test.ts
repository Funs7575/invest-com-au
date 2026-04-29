import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/email-templates", () => ({
  notificationFooter: (_email: string) => "<footer>unsubscribe</footer>",
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
}));

const mockAuth = { getUser: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/switch-story/moderate/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_USER = { id: "admin-1", email: "admin@invest.com.au" };
const NON_ADMIN_USER = { id: "user-1", email: "user@example.com" };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/switch-story/moderate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["update", "eq", "select"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/switch-story/moderate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFetch.mockResolvedValue({ ok: true });
    process.env.RESEND_API_KEY = "re_test";
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "no session" } });
    const res = await POST(makeRequest({ story_id: 1, action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user is not admin", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: NON_ADMIN_USER }, error: null });
    const res = await POST(makeRequest({ story_id: 1, action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/switch-story/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "bad json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid json/i);
  });

  it("returns 400 when story_id is missing", async () => {
    const res = await POST(makeRequest({ action: "approve" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/story_id is required/i);
  });

  it("returns 400 for invalid action", async () => {
    const res = await POST(makeRequest({ story_id: 1, action: "delete" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/action must be approve or reject/i);
  });

  it("approves a story and returns success", async () => {
    const updateChain = makeChain({ data: { id: 1, status: "approved" }, error: null });
    const authorChain = makeChain({
      data: { author_name: "Jane", author_email: "jane@example.com", source_broker: "CommSec", dest_broker: "Stake" },
      error: null,
    });
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return updateChain;
      return authorChain;
    });

    const res = await POST(makeRequest({ story_id: 1, action: "approve" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.story.status).toBe("approved");
  });

  it("rejects a story and includes moderation_note", async () => {
    const updateChain = makeChain({ data: { id: 2, status: "rejected" }, error: null });
    const authorChain = makeChain({
      data: { author_name: "Bob", author_email: "bob@test.com", source_broker: "ANZ", dest_broker: "Stake" },
      error: null,
    });
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return updateChain;
      return authorChain;
    });

    const res = await POST(makeRequest({ story_id: 2, action: "reject", moderation_note: "Too promotional" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 on DB update error", async () => {
    const chain = makeChain({ data: null, error: { message: "DB error" } });
    mockAdminFrom.mockReturnValue(chain);

    const res = await POST(makeRequest({ story_id: 1, action: "approve" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to update/i);
  });

  it("returns 404 when story not found after update", async () => {
    const chain = makeChain({ data: null, error: null });
    mockAdminFrom.mockReturnValue(chain);

    const res = await POST(makeRequest({ story_id: 999, action: "approve" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/story not found/i);
  });

  it("skips notification email when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;

    const updateChain = makeChain({ data: { id: 1, status: "approved" }, error: null });
    mockAdminFrom.mockReturnValue(updateChain);

    const res = await POST(makeRequest({ story_id: 1, action: "approve" }));
    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
