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

const mockValidateApiKey = vi.fn();
const mockLogApiRequest = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  validateApiKey: (...args: unknown[]) => mockValidateApiKey(...args),
  logApiRequest: (...args: unknown[]) => mockLogApiRequest(...args),
  API_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  },
}));

import { GET, POST, DELETE, OPTIONS } from "@/app/api/v1/widget-licenses/route";

// ── Helpers ──────────────────────────────────────────────────────────────────────

/**
 * A chainable Supabase query-builder stub that is also a thenable: every
 * builder method returns the same object, and awaiting it anywhere in the
 * chain resolves to `result`. One builder = one query result; use
 * mockReturnValueOnce to script multi-query handlers (count then insert).
 */
function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "update", "insert", "single", "maybeSingle"]) {
    b[m] = vi.fn(() => b);
  }
  (b as { then?: unknown }).then = (resolve: (v: unknown) => void) => resolve(result);
  return b;
}

function proKey(overrides: Record<string, unknown> = {}) {
  return { id: "key-pro-1", tier: "pro", name: "Test", ...overrides };
}

function makeReq(method: string, opts: { query?: string; body?: unknown } = {}): NextRequest {
  const url = `http://localhost/api/v1/widget-licenses${opts.query ?? ""}`;
  return new NextRequest(url, {
    method,
    headers: { Authorization: "Bearer ica_testkey123", "Content-Type": "application/json" },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/widget-licenses", () => {
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("auth + tier gating", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns 401 when API key is invalid", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "Invalid API key" });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Invalid API key");
  });

  it("GET honours a custom statusCode (429 daily limit)", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "limit", statusCode: 429 });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(429);
  });

  it("GET returns 403 for a Basic/Free tier key", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: proKey({ tier: "basic" }) });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/Pro or Enterprise/i);
  });

  it("logs the failed-auth GET request", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "nope" });
    await GET(makeReq("GET"));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, method: "GET", apiKeyId: null }),
    );
  });

  it("POST returns 403 for a non-Pro tier", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: proKey({ tier: "free" }) });
    const res = await POST(makeReq("POST", { body: { name: "X" } }));
    expect(res.status).toBe(403);
  });
});

describe("GET — list licenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: proKey() });
  });

  it("returns active licenses for the key", async () => {
    const rows = [
      { id: "l1", name: "Site A", token_prefix: "wlt_abc", allowed_domains: ["a.com"], is_active: true, created_at: "x", updated_at: "y" },
    ];
    mockAdminFrom.mockReturnValue(makeBuilder({ data: rows, error: null }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.licenses).toHaveLength(1);
    expect(body.embed_url_template).toContain("{token}");
  });

  it("returns [] when the table is empty", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    expect((await res.json()).licenses).toEqual([]);
  });

  it("returns 500 on a DB error", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: { message: "boom" } }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
  });

  it("logs a successful GET with the apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
    await GET(makeReq("GET"));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-pro-1" }),
    );
  });
});

describe("POST — create license", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: proKey() });
  });

  it("creates a license and returns 201 with a one-time token", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder({ count: 2, error: null })) // count
      .mockReturnValueOnce(
        makeBuilder({
          data: { id: "new-1", name: "Site B", token_prefix: "wlt_xxxxxxxx", allowed_domains: ["b.com"], is_active: true, created_at: "now" },
          error: null,
        }),
      );
    const res = await POST(makeReq("POST", { body: { name: "Site B", allowed_domains: ["b.com"] } }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.license.token).toMatch(/^wlt_/);
    expect(body.embed_url).toContain("license=wlt_");
    expect(body.message).toMatch(/will not be shown again/i);
  });

  it("returns 400 when the per-key license limit is reached", async () => {
    mockAdminFrom.mockReturnValueOnce(makeBuilder({ count: 10, error: null }));
    const res = await POST(makeReq("POST", { body: { name: "Over" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Maximum 10/i);
  });

  it("returns 500 when the count query fails", async () => {
    mockAdminFrom.mockReturnValueOnce(makeBuilder({ count: null, error: { message: "count boom" } }));
    const res = await POST(makeReq("POST", { body: { name: "X" } }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when the insert fails", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: { message: "insert boom" } }));
    const res = await POST(makeReq("POST", { body: { name: "X" } }));
    expect(res.status).toBe(500);
  });

  it("rejects an invalid domain with 400 (zod regex)", async () => {
    const res = await POST(makeReq("POST", { body: { name: "X", allowed_domains: ["not a domain"] } }));
    expect(res.status).toBe(400);
  });

  it("defaults name and domains when omitted (empty body)", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(
        makeBuilder({ data: { id: "d1", name: "", token_prefix: "wlt_p", allowed_domains: [], is_active: true, created_at: "n" }, error: null }),
      );
    const res = await POST(makeReq("POST", { body: {} }));
    expect(res.status).toBe(201);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/widget-licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("DELETE — deactivate license", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: proKey() });
  });

  it("returns 400 when ?id is missing", async () => {
    const res = await DELETE(makeReq("DELETE"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Missing \?id/i);
  });

  it("deactivates a license and returns 200", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: { id: "l9" }, error: null }));
    const res = await DELETE(makeReq("DELETE", { query: "?id=l9" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/deleted/i);
    expect(body.id).toBe("l9");
  });

  it("returns 404 when the license does not exist for this key", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await DELETE(makeReq("DELETE", { query: "?id=missing" }));
    expect(res.status).toBe(404);
  });

  it("returns 500 on a DB error", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: { message: "boom" } }));
    const res = await DELETE(makeReq("DELETE", { query: "?id=l9" }));
    expect(res.status).toBe(500);
  });

  it("returns 403 for a non-Pro tier", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: proKey({ tier: "basic" }) });
    const res = await DELETE(makeReq("DELETE", { query: "?id=l9" }));
    expect(res.status).toBe(403);
  });
});
