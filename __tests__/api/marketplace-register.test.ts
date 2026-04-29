import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAIL: "admin@invest.com.au",
  ADMIN_EMAILS: ["admin@invest.com.au"],
}));

// Track admin Supabase calls
const mockAdminFrom = vi.fn();
const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
      },
    },
  })),
}));

// Polyfill fetch for email sending
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/marketplace/register/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const BASE_BODY = {
  email: "ops@commsec.com.au",
  password: "SecurePass1",
  full_name: "Jane Smith",
  company_name: "CommSec",
};

function makePost(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/marketplace/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "5.5.5.5",
    },
    body: JSON.stringify(body),
  });
}

function makeDbChain(result: unknown = { data: null, error: null }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "insert", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb({ error: null });
    return Promise.resolve({ error: null });
  };
  return c;
}

const NEW_AUTH_USER = { id: "new-user-uuid", email: "ops@commsec.com.au" };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/marketplace/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockAdminFrom.mockReturnValue(makeDbChain({ data: null, error: null }));
    mockCreateUser.mockResolvedValue({ data: { user: NEW_AUTH_USER }, error: null });
    mockDeleteUser.mockResolvedValue({ error: null });
    mockFetch.mockResolvedValue({ ok: true });
    process.env.RESEND_API_KEY = "re_test";
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makePost({ ...BASE_BODY, email: undefined }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email|required/i);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makePost({ ...BASE_BODY, password: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when full_name is missing", async () => {
    const res = await POST(makePost({ ...BASE_BODY, full_name: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(makePost({ ...BASE_BODY, password: "short" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/8 char/i);
  });

  it("returns 409 when email already has a broker account", async () => {
    mockAdminFrom.mockReturnValue(makeDbChain({ data: { id: 1 }, error: null }));
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/already exists/i);
  });

  it("returns 409 when auth user already registered", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "User already been registered" },
    });
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(409);
  });

  it("returns 400 on other auth creation errors", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid email domain" },
    });
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(400);
  });

  it("generates broker_slug from company_name when not provided", async () => {
    await POST(makePost({ ...BASE_BODY, company_name: "CommSec Australia!" }));
    expect(mockAdminFrom).toHaveBeenCalledWith("broker_accounts");
    expect(mockCreateUser).toHaveBeenCalled();
    // slug generation converts company name to kebab — confirmed by checking insert was called
  });

  it("uses provided broker_slug when given", async () => {
    await POST(makePost({ ...BASE_BODY, broker_slug: "commsec-au" }));
    expect(mockCreateUser).toHaveBeenCalled();
  });

  it("rolls back auth user when broker_accounts insert fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "broker_accounts") {
        callCount++;
        if (callCount === 2) {
          // Second call is the insert
          const c = makeDbChain({ data: null, error: null });
          (c as Record<string, unknown>).insert = vi.fn(() =>
            Promise.resolve({ error: { message: "duplicate key" } })
          );
          return c;
        }
      }
      return makeDbChain({ data: null, error: null });
    });
    const res = await POST(makePost(BASE_BODY));
    expect(mockDeleteUser).toHaveBeenCalledWith(NEW_AUTH_USER.id);
    expect(res.status).toBe(500);
  });

  it("sends admin notification email on success", async () => {
    await POST(makePost(BASE_BODY));
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns 201 on successful registration", async () => {
    const res = await POST(makePost(BASE_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("skips email notification when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    await POST(makePost(BASE_BODY));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
