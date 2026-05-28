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

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeKey(tier = "pro") {
  return { id: "key-wl", name: "Test", key_prefix: "ica_test", tier };
}

function makeValidAuth(tier = "pro") {
  return { valid: true, apiKey: makeKey(tier) };
}

function makeInvalidAuth(msg = "Invalid API key", statusCode?: number) {
  return { valid: false, error: msg, statusCode };
}

function makeLicense(overrides: Record<string, unknown> = {}) {
  return {
    id: "lic-1",
    name: "Acme Embed",
    token_prefix: "wlt_abcdef012345",
    allowed_domains: ["acme.com"],
    is_active: true,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

/** GET: .select().eq().eq().order() — awaited directly. */
function makeListBuilder(rows: unknown[] = [], error: unknown = null) {
  const result = { data: rows, error };
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve(result)),
  };
  return builder;
}

/** POST count: .select(...,{count,head}).eq().eq() — awaited directly. */
function makeCountBuilder(count: number, error: unknown = null) {
  const result = { count, error };
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => Promise.resolve(result)),
  };
  // Allow either one or two `.eq()` calls before awaiting by making `.eq()`
  // return a thenable that is also chainable.
  builder.eq = vi.fn(() => {
    const chain: Record<string, unknown> = {
      eq: vi.fn(() => Promise.resolve(result)),
      then: (resolve: (v: unknown) => unknown) => resolve(result),
    };
    return chain;
  });
  return builder;
}

/** POST insert: .insert().select().single(). */
function makeInsertBuilder(row: unknown, error: unknown = null) {
  const builder: Record<string, unknown> = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data: row, error })),
  };
  return builder;
}

/** DELETE: .update().eq().eq().select().maybeSingle(). */
function makeUpdateBuilder(row: unknown, error: unknown = null) {
  const builder: Record<string, unknown> = {
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    select: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve({ data: row, error })),
  };
  return builder;
}

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/v1/widget-licenses", {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/widget-licenses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer ica_testkey123" },
    body: JSON.stringify(body),
  });
}

function makeDelete(id?: string): NextRequest {
  const url = `http://localhost/api/v1/widget-licenses${id ? `?id=${id}` : ""}`;
  return new NextRequest(url, {
    method: "DELETE",
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/widget-licenses", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/widget-licenses — auth & tier", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Missing Authorization header"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Missing Authorization header");
  });

  it("honours the statusCode from auth (e.g. 403 endpoint gate)", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Endpoint not on tier", 403));
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  it("returns 403 for a valid key on a non-pro/enterprise tier", async () => {
    mockValidateApiKey.mockResolvedValue(makeValidAuth("basic"));
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/pro or enterprise/i);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/widget-licenses — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth("pro"));
  });

  it("lists active licenses scoped to the key", async () => {
    const builder = makeListBuilder([makeLicense()]);
    mockAdminFrom.mockReturnValue(builder);

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.licenses).toHaveLength(1);
    expect(body.licenses[0].token_prefix).toBe("wlt_abcdef012345");
    expect(body.embed_url_template).toContain("{token}");
    expect(builder.eq).toHaveBeenCalledWith("api_key_id", "key-wl");
    expect(builder.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("returns an empty array when the key has no licenses", async () => {
    mockAdminFrom.mockReturnValue(makeListBuilder([]));
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.licenses).toEqual([]);
  });

  it("returns 500 on a DB error", async () => {
    mockAdminFrom.mockReturnValue(makeListBuilder([], { message: "DB error" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/list widget licenses/i);
  });

  it("logs successful requests with apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeListBuilder([]));
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-wl" }),
    );
  });
});

describe("POST /api/v1/widget-licenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth("pro"));
  });

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Missing Authorization header"));
    const res = await POST(makePost({ name: "Embed" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-pro/enterprise tier", async () => {
    mockValidateApiKey.mockResolvedValue(makeValidAuth("free"));
    const res = await POST(makePost({ name: "Embed" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid JSON body", async () => {
    const badReq = new NextRequest("http://localhost/api/v1/widget-licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer ica_testkey123" },
      body: "not-json{",
    });
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });

  it("returns 400 when allowed_domains contains an invalid hostname", async () => {
    const res = await POST(makePost({ name: "Embed", allowed_domains: ["not a domain"] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("validation_error");
  });

  it("returns 400 when the per-key license limit is reached", async () => {
    mockAdminFrom.mockReturnValueOnce(makeCountBuilder(10));
    const res = await POST(makePost({ name: "Embed" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/maximum/i);
  });

  it("returns 500 when the count query fails", async () => {
    mockAdminFrom.mockReturnValueOnce(makeCountBuilder(0, { message: "count failed" }));
    const res = await POST(makePost({ name: "Embed" }));
    expect(res.status).toBe(500);
  });

  it("creates a license and returns 201 with the plaintext token once", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeCountBuilder(0))
      .mockReturnValueOnce(
        makeInsertBuilder(makeLicense({ token_prefix: "wlt_newprefix000" })),
      );

    const res = await POST(makePost({ name: "Acme Embed", allowed_domains: ["acme.com"] }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.license.token).toMatch(/^wlt_/);
    expect(body.license.token_prefix).toBe("wlt_newprefix000");
    expect(body.embed_url).toContain("license=wlt_");
    expect(body.message).toMatch(/not be shown again/i);
  });

  it("returns 500 when the insert fails", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeCountBuilder(0))
      .mockReturnValueOnce(makeInsertBuilder(null, { message: "insert failed" }));
    const res = await POST(makePost({ name: "Embed" }));
    expect(res.status).toBe(500);
  });

  it("logs a successful creation with apiKeyId and 201", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeCountBuilder(0))
      .mockReturnValueOnce(makeInsertBuilder(makeLicense()));
    await POST(makePost({ name: "Embed" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 201, apiKeyId: "key-wl" }),
    );
  });
});

describe("DELETE /api/v1/widget-licenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth("pro"));
  });

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Missing Authorization header"));
    const res = await DELETE(makeDelete("lic-1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-pro/enterprise tier", async () => {
    mockValidateApiKey.mockResolvedValue(makeValidAuth("free"));
    const res = await DELETE(makeDelete("lic-1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when ?id= is missing", async () => {
    const res = await DELETE(makeDelete());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/id=/i);
  });

  it("returns 404 when the license is not found for this key", async () => {
    mockAdminFrom.mockReturnValue(makeUpdateBuilder(null));
    const res = await DELETE(makeDelete("lic-1"));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });

  it("deactivates the license and returns 200", async () => {
    const builder = makeUpdateBuilder({ id: "lic-1" });
    mockAdminFrom.mockReturnValue(builder);
    const res = await DELETE(makeDelete("lic-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("lic-1");
    expect(body.message).toMatch(/deleted/i);
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false }),
    );
  });

  it("returns 500 on a DB error", async () => {
    mockAdminFrom.mockReturnValue(makeUpdateBuilder(null, { message: "DB error" }));
    const res = await DELETE(makeDelete("lic-1"));
    expect(res.status).toBe(500);
  });
});
