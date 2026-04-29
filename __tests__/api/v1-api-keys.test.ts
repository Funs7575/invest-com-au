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

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: vi.fn((s: string) => s),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/api-auth", () => ({
  API_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  },
}));

import { POST, OPTIONS } from "@/app/api/v1/api-keys/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/api-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeValidBody(overrides = {}) {
  return {
    email: "dev@example.com",
    name: "My App",
    company_name: "Acme Corp",
    use_case: "Building a fintech dashboard",
    ...overrides,
  };
}

function makeCountBuilder(count: number, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(() => Promise.resolve({ count, error })),
  };
}

function makeInsertBuilder(error: unknown = null) {
  return {
    insert: vi.fn(() => Promise.resolve({ error })),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/api-keys", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("POST /api/v1/api-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: not rate-limited for either check
    mockIsRateLimited.mockResolvedValue(false);
    mockSendEmail.mockResolvedValue({ ok: true });
  });

  it("returns 429 when IP rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makePost(makeValidBody()));
    expect(res.status).toBe(429);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makePost({ name: "My App" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it("returns 400 when email is invalid format", async () => {
    const res = await POST(makePost(makeValidBody({ email: "not-an-email" })));
    expect(res.status).toBe(400);
  });

  it("returns 429 when per-email rate-limited", async () => {
    // IP check passes, email check fails
    mockIsRateLimited
      .mockResolvedValueOnce(false) // IP
      .mockResolvedValueOnce(true); // email
    const res = await POST(makePost(makeValidBody()));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it("returns 400 when name is too short", async () => {
    const res = await POST(makePost(makeValidBody({ name: "x" })));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name/i);
  });

  it("returns 400 when name is too long (>100 chars)", async () => {
    const res = await POST(makePost(makeValidBody({ name: "a".repeat(101) })));
    expect(res.status).toBe(400);
  });

  it("returns 400 when max keys per email exceeded", async () => {
    mockAdminFrom.mockReturnValue(makeCountBuilder(3)); // already at limit
    const res = await POST(makePost(makeValidBody()));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/maximum/i);
  });

  it("returns 500 when DB count query fails", async () => {
    mockAdminFrom.mockReturnValue(makeCountBuilder(0, { message: "DB error" }));
    const res = await POST(makePost(makeValidBody()));
    expect(res.status).toBe(500);
  });

  it("returns 500 when API key insert fails", async () => {
    mockAdminFrom.mockImplementationOnce(() => makeCountBuilder(0)).mockReturnValue(makeInsertBuilder({ message: "insert failed" }));
    const res = await POST(makePost(makeValidBody()));
    expect(res.status).toBe(500);
  });

  it("creates API key and returns 201 with key in response", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeCountBuilder(0))
      .mockReturnValue(makeInsertBuilder(null));

    const res = await POST(makePost(makeValidBody()));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.api_key).toMatch(/^ica_/);
    expect(data.key_prefix).toMatch(/^ica_/);
    expect(data.tier).toBe("free");
    expect(data.rate_limits.per_minute).toBe(30);
    expect(data.rate_limits.per_day).toBe(1000);
  });

  it("sends confirmation email on success", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeCountBuilder(0))
      .mockReturnValue(makeInsertBuilder(null));

    await POST(makePost(makeValidBody()));
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "dev@example.com", subject: expect.stringContaining("API Key") }),
    );
  });

  it("returns 400 on invalid JSON body", async () => {
    const badReq = new NextRequest("http://localhost/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{",
    });
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });

  it("accepts optional company_name and use_case fields", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeCountBuilder(0))
      .mockReturnValue(makeInsertBuilder(null));

    const res = await POST(makePost(makeValidBody({ company_name: null, use_case: null })));
    expect(res.status).toBe(201);
  });
});
