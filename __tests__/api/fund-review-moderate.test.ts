import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
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

import { POST } from "@/app/api/fund-review/moderate/route";

const ADMIN_USER = { id: "admin-1", email: "admin@invest.com.au" };
const NON_ADMIN = { id: "user-1", email: "user@example.com" };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/fund-review/moderate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeUpdateChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["update", "eq", "select"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("POST /api/fund-review/moderate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    mockAuth.getUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("no session") });
    const res = await POST(makeRequest({ review_id: 1, action: "approve" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 when user is not an admin", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: NON_ADMIN }, error: null });
    const res = await POST(makeRequest({ review_id: 1, action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/fund-review/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON/i);
  });

  it("returns 400 when review_id is missing", async () => {
    const res = await POST(makeRequest({ action: "approve" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/review_id/i);
  });

  it("returns 400 when action is invalid", async () => {
    const res = await POST(makeRequest({ review_id: 42, action: "delete" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/approve or reject/i);
  });

  it("returns 200 on approve success", async () => {
    const chain = makeUpdateChain({ data: { id: 42, status: "approved" }, error: null });
    mockAdminFrom.mockReturnValue(chain);
    const res = await POST(makeRequest({ review_id: 42, action: "approve" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.review.status).toBe("approved");
  });

  it("returns 200 on reject success", async () => {
    const chain = makeUpdateChain({ data: { id: 42, status: "rejected" }, error: null });
    mockAdminFrom.mockReturnValue(chain);
    const res = await POST(makeRequest({ review_id: 42, action: "reject", moderation_note: "Spam content" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 404 when review data is null after update", async () => {
    const chain = makeUpdateChain({ data: null, error: null });
    mockAdminFrom.mockReturnValue(chain);
    const res = await POST(makeRequest({ review_id: 99, action: "approve" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("returns 500 on DB error", async () => {
    const chain = makeUpdateChain({ data: null, error: { message: "DB down" } });
    mockAdminFrom.mockReturnValue(chain);
    const res = await POST(makeRequest({ review_id: 1, action: "approve" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to update/i);
  });

  it("sends approval email when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const updateChain = makeUpdateChain({ data: { id: 1, status: "approved" }, error: null });
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          display_name: "Alice Smith",
          email: "alice@example.com",
          fund_slug: "pengana-fund",
          fund_listings: [{ title: "Pengana Fund" }],
        },
      }),
    };
    mockAdminFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(selectChain);
    await POST(makeRequest({ review_id: 1, action: "approve" }));
    expect(mockFetch).toHaveBeenCalled();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("resend.com");
    const body = JSON.parse(opts.body as string);
    expect(body.subject).toContain("Pengana Fund");
    expect(body.subject).toContain("live");
  });

  it("does not send email when RESEND_API_KEY is not set", async () => {
    const chain = makeUpdateChain({ data: { id: 1, status: "approved" }, error: null });
    mockAdminFrom.mockReturnValue(chain);
    await POST(makeRequest({ review_id: 1, action: "approve" }));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends rejection email with moderation_note when rejecting", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const updateChain = makeUpdateChain({ data: { id: 1, status: "rejected" }, error: null });
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          display_name: "Bob",
          email: "bob@example.com",
          fund_slug: "syndicate-property-fund",
          fund_listings: [{ title: "Syndicate Property Fund" }],
        },
      }),
    };
    mockAdminFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(selectChain);
    await POST(makeRequest({ review_id: 1, action: "reject", moderation_note: "Off topic" }));
    expect(mockFetch).toHaveBeenCalled();
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.subject).toContain("Syndicate Property Fund");
    expect(body.html).toContain("Off topic");
  });
});
