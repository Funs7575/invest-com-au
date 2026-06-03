import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
// vi.mock() is hoisted above all imports/consts, so referenced vars must come
// from vi.hoisted().

const { mockAdminFrom, mockValidateApiKey, mockLogApiRequest } = vi.hoisted(() => ({
  mockAdminFrom: vi.fn(),
  mockValidateApiKey: vi.fn(),
  mockLogApiRequest: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/api-auth", () => ({
  validateApiKey: (...args: unknown[]) => mockValidateApiKey(...args),
  logApiRequest: (...args: unknown[]) => mockLogApiRequest(...args),
  API_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST, DELETE, OPTIONS } from "@/app/api/v1/widget-licenses/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY_PRO = {
  id: "key-pro-1",
  name: "Pro Key",
  key_prefix: "ica_pro",
  tier: "pro",
};

const VALID_KEY_ENTERPRISE = {
  id: "key-ent-1",
  name: "Enterprise Key",
  key_prefix: "ica_ent",
  tier: "enterprise",
};

const VALID_KEY_FREE = {
  id: "key-free-1",
  name: "Free Key",
  key_prefix: "ica_free",
  tier: "free",
};

const VALID_KEY_BASIC = {
  id: "key-basic-1",
  name: "Basic Key",
  key_prefix: "ica_basic",
  tier: "basic",
};

function makeValidAuthPro() {
  return { valid: true, apiKey: VALID_KEY_PRO };
}

function makeValidAuthEnterprise() {
  return { valid: true, apiKey: VALID_KEY_ENTERPRISE };
}

function makeValidAuthFree() {
  return { valid: true, apiKey: VALID_KEY_FREE };
}

function makeValidAuthBasic() {
  return { valid: true, apiKey: VALID_KEY_BASIC };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg, statusCode: 401 };
}

function makeGetReq(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/widget-licenses${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

function makePostReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/widget-licenses", {
    method: "POST",
    headers: {
      Authorization: "Bearer ica_testkey123",
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeDeleteReq(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/widget-licenses${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    method: "DELETE",
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

/** Build a chainable supabase builder for list (GET) queries. */
function makeListBuilder(rows: unknown[] = [], error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve({ data: rows, error })),
  };
}

/** Update builder — chains .update().eq().eq().select().maybeSingle() */
function makeUpdateBuilder(data: unknown = null, error: unknown = null) {
  const maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  const select = vi.fn(() => ({ maybeSingle }));
  const eq2 = vi.fn(() => ({ select }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const update = vi.fn(() => ({ eq: eq1 }));
  return { update };
}

// ── OPTIONS ────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/widget-licenses", () => {
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

// ── GET ────────────────────────────────────────────────────────────────────────

describe("GET /api/v1/widget-licenses — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key is missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("No API key"));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("No API key");
  });

  it("returns 401 when API key is invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Invalid or inactive API key"));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 for free-tier key", async () => {
    mockValidateApiKey.mockResolvedValue(makeValidAuthFree());
    const res = await GET(makeGetReq());
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/Pro or Enterprise/i);
  });

  it("returns 403 for basic-tier key", async () => {
    mockValidateApiKey.mockResolvedValue(makeValidAuthBasic());
    const res = await GET(makeGetReq());
    expect(res.status).toBe(403);
  });
});

describe("GET /api/v1/widget-licenses — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuthPro());
  });

  it("returns 200 with licenses array and embed_url_template", async () => {
    const fakeRows = [
      {
        id: "lic-1",
        name: "My Site",
        token_prefix: "wlt_abcde",
        allowed_domains: ["example.com"],
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];
    mockAdminFrom.mockReturnValue(makeListBuilder(fakeRows));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.licenses).toHaveLength(1);
    expect(body.licenses[0].id).toBe("lic-1");
    expect(body.embed_url_template).toContain("{token}");
  });

  it("returns empty licenses array when none exist", async () => {
    mockAdminFrom.mockReturnValue(makeListBuilder([]));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.licenses).toEqual([]);
  });

  it("enterprise tier also works", async () => {
    mockValidateApiKey.mockResolvedValue(makeValidAuthEnterprise());
    mockAdminFrom.mockReturnValue(makeListBuilder([]));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
  });

  it("returns 500 when DB list query fails", async () => {
    mockAdminFrom.mockReturnValue(makeListBuilder([], { message: "DB error" }));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/Failed to list widget licenses/);
  });
});

// ── POST ───────────────────────────────────────────────────────────────────────

describe("POST /api/v1/widget-licenses — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key is invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    const res = await POST(makePostReq({ name: "Test" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for free-tier key", async () => {
    mockValidateApiKey.mockResolvedValue(makeValidAuthFree());
    const res = await POST(makePostReq({ name: "Test" }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/widget-licenses — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuthPro());
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/widget-licenses", {
      method: "POST",
      headers: { Authorization: "Bearer ica_test", "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("accepts body with empty name (schema default)", async () => {
    // Count check: under limit; insert succeeds
    const fakeInserted = {
      id: "lic-new",
      name: "",
      token_prefix: "wlt_abcdef1",
      allowed_domains: [],
      is_active: true,
      created_at: "2026-05-01T00:00:00Z",
    };
    // Build a mock that handles two sequential .from() calls differently:
    // 1st call: count check
    // 2nd call: insert
    const countResult = Promise.resolve({ count: 0, error: null });
    const countMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn(() => countResult),
      })),
    };
    const insertResult = Promise.resolve({ data: fakeInserted, error: null });
    const insertMock = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => insertResult),
        })),
      })),
    };
    mockAdminFrom
      .mockReturnValueOnce(countMock)
      .mockReturnValueOnce(insertMock);

    const res = await POST(makePostReq({}));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.license).toBeDefined();
    expect(typeof body.license.token).toBe("string");
    expect(body.license.token).toMatch(/^wlt_/);
  });

  it("returns 400 when domain in allowed_domains is invalid", async () => {
    const res = await POST(makePostReq({ name: "Test", allowed_domains: ["not a domain!!"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when too many domains (>20)", async () => {
    const domains = Array.from({ length: 21 }, (_, i) => `domain${i}.com`);
    const res = await POST(makePostReq({ name: "Test", allowed_domains: domains }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/widget-licenses — limit enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuthPro());
  });

  it("returns 400 when license limit (10) is already reached", async () => {
    const countMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn(() => Promise.resolve({ count: 10, error: null })),
      })),
    };
    mockAdminFrom.mockReturnValue(countMock);
    const res = await POST(makePostReq({ name: "Extra" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Maximum 10/);
  });

  it("returns 500 when count query fails", async () => {
    const countMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn(() => Promise.resolve({ count: null, error: { message: "DB error" } })),
      })),
    };
    mockAdminFrom.mockReturnValue(countMock);
    const res = await POST(makePostReq({ name: "Test" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/Failed to check license count/);
  });
});

describe("POST /api/v1/widget-licenses — insert failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuthPro());
  });

  it("returns 500 when insert fails", async () => {
    const countMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn(() => Promise.resolve({ count: 0, error: null })),
      })),
    };
    const insertMock = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: { message: "insert failed" } })),
        })),
      })),
    };
    mockAdminFrom
      .mockReturnValueOnce(countMock)
      .mockReturnValueOnce(insertMock);

    const res = await POST(makePostReq({ name: "Test" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/Failed to create widget license/);
  });
});

describe("POST /api/v1/widget-licenses — happy path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuthPro());
  });

  function setupSuccessfulPost(name = "My License", allowedDomains: string[] = []) {
    const fakeInserted = {
      id: "lic-new-1",
      name,
      token_prefix: "wlt_abc12345",
      allowed_domains: allowedDomains,
      is_active: true,
      created_at: "2026-05-01T00:00:00Z",
    };
    const countMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn(() => Promise.resolve({ count: 3, error: null })),
      })),
    };
    const insertMock = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: fakeInserted, error: null })),
        })),
      })),
    };
    mockAdminFrom
      .mockReturnValueOnce(countMock)
      .mockReturnValueOnce(insertMock);
    return fakeInserted;
  }

  it("returns 201 with license token on success", async () => {
    setupSuccessfulPost();
    const res = await POST(makePostReq({ name: "My License" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.license.token).toMatch(/^wlt_/);
    expect(body.license.id).toBe("lic-new-1");
  });

  it("returned token is shown exactly once and starts with wlt_", async () => {
    setupSuccessfulPost();
    const res = await POST(makePostReq({ name: "Test" }));
    const body = await res.json();
    expect(body.license.token).toMatch(/^wlt_[a-f0-9]{64}$/);
  });

  it("includes embed_url with token", async () => {
    setupSuccessfulPost();
    const res = await POST(makePostReq({ name: "Test" }));
    const body = await res.json();
    expect(body.embed_url).toContain("wlt_");
    expect(body.embed_url).toContain("invest.com.au/api/widget/licensed");
  });

  it("includes message about saving the token", async () => {
    setupSuccessfulPost();
    const res = await POST(makePostReq({ name: "Test" }));
    const body = await res.json();
    expect(body.message).toContain("Save your license token");
  });

  it("accepts allowed_domains in body", async () => {
    setupSuccessfulPost("Restricted", ["example.com", "app.example.com"]);
    const res = await POST(makePostReq({ name: "Restricted", allowed_domains: ["example.com", "app.example.com"] }));
    expect(res.status).toBe(201);
  });

  it("enterprise tier can also create licenses", async () => {
    mockValidateApiKey.mockResolvedValue(makeValidAuthEnterprise());
    setupSuccessfulPost();
    const res = await POST(makePostReq({ name: "Enterprise License" }));
    expect(res.status).toBe(201);
  });
});

// ── DELETE ─────────────────────────────────────────────────────────────────────

describe("DELETE /api/v1/widget-licenses — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key is invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    const res = await DELETE(makeDeleteReq({ id: "lic-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for basic-tier key", async () => {
    mockValidateApiKey.mockResolvedValue(makeValidAuthBasic());
    const res = await DELETE(makeDeleteReq({ id: "lic-1" }));
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/v1/widget-licenses — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuthPro());
  });

  it("returns 400 when ?id is missing", async () => {
    const res = await DELETE(makeDeleteReq());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Missing \?id/);
  });
});

describe("DELETE /api/v1/widget-licenses — success and errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuthPro());
  });

  it("returns 200 when license deactivated successfully", async () => {
    const updateMock = makeUpdateBuilder({ id: "lic-1" });
    mockAdminFrom.mockReturnValue(updateMock);
    const res = await DELETE(makeDeleteReq({ id: "lic-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("License deleted");
    expect(data.id).toBe("lic-1");
  });

  it("returns 404 when license not found or already deleted", async () => {
    const updateMock = makeUpdateBuilder(null);
    mockAdminFrom.mockReturnValue(updateMock);
    const res = await DELETE(makeDeleteReq({ id: "lic-missing" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found or already deleted/);
  });

  it("returns 500 when update query fails", async () => {
    const updateMock = makeUpdateBuilder(null, { message: "DB error" });
    mockAdminFrom.mockReturnValue(updateMock);
    const res = await DELETE(makeDeleteReq({ id: "lic-1" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/Failed to delete widget license/);
  });
});
