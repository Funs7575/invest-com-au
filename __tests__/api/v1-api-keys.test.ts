import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockIsRateLimited, mockAdminFrom, mockSendEmail, mockLog } = vi.hoisted(() => {
  const mockIsRateLimited = vi.fn().mockResolvedValue(false);
  const mockAdminFrom = vi.fn();
  const mockSendEmail = vi.fn().mockResolvedValue(undefined);
  const mockLog = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
  return { mockIsRateLimited, mockAdminFrom, mockSendEmail, mockLog };
});

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mockIsRateLimited }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));
vi.mock("@/lib/resend", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/logger", () => ({ logger: () => mockLog }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));

import { POST, OPTIONS } from "@/app/api/v1/api-keys/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/v1/api-keys", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsRateLimited.mockResolvedValue(false);
  mockAdminFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  }));
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/api-keys", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeTruthy();
  });
});

describe("POST /api/v1/api-keys", () => {
  it("returns 429 when IP rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeRequest({ email: "user@example.com", name: "My App" }));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toContain("Too many requests");
  });

  it("returns 400 for missing email", async () => {
    const res = await POST(makeRequest({ name: "My App" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("email");
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(makeRequest({ email: "not-an-email", name: "My App" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("email");
  });

  it("returns 429 when email rate-limited (1/day per email)", async () => {
    // First call (IP check) passes, second call (email check) blocks
    mockIsRateLimited
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const res = await POST(makeRequest({ email: "user@example.com", name: "My App" }));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toContain("email address");
  });

  it("returns 400 for name too short (< 2 chars)", async () => {
    const res = await POST(makeRequest({ email: "user@example.com", name: "A" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("name");
  });

  it("returns 500 when DB count query fails", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: null, error: { message: "DB error" } }),
    });
    const res = await POST(makeRequest({ email: "user@example.com", name: "My App" }));
    expect(res.status).toBe(500);
  });

  it("returns 400 when max 3 keys per email reached", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
    });
    const res = await POST(makeRequest({ email: "user@example.com", name: "My App" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Maximum 3");
  });

  it("returns 500 when DB insert fails", async () => {
    mockAdminFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      insert: vi.fn().mockResolvedValue({ error: { message: "insert failed" } }),
    }));
    const res = await POST(makeRequest({ email: "user@example.com", name: "My App" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Failed to create API key");
  });

  it("returns 201 with api_key starting with 'ica_' on success", async () => {
    const res = await POST(makeRequest({ email: "user@example.com", name: "My App" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.api_key).toMatch(/^ica_[0-9a-f]+$/);
    expect(body.key_prefix).toBe(body.api_key.slice(0, 8));
    expect(body.tier).toBe("free");
    expect(body.message).toContain("not be shown again");
  });

  it("sends confirmation email on success", async () => {
    await POST(makeRequest({ email: "user@example.com", name: "My App", company_name: "Acme Corp" }));
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@example.com" }),
    );
  });

  it("accepts optional company_name and use_case without error", async () => {
    const res = await POST(makeRequest({
      email: "dev@example.com",
      name: "Dev Tool",
      company_name: "DevCo Pty Ltd",
      use_case: "Building a portfolio tracker",
    }));
    expect(res.status).toBe(201);
  });
});
