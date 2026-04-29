import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
const mockIsValidEmail = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (email: string) => mockIsValidEmail(email),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/quick-audit/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_BODY = {
  email: "investor@example.com",
  current_broker: "CommSec",
  trades_per_year: 12,
  avg_trade_size: 5000,
};

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/quick-audit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function makeSelectChain(data: unknown, error: unknown = null) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.limit = vi.fn().mockResolvedValue({ data, error });
  return c;
}

function makeInsertChain(error: unknown = null) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn().mockResolvedValue({ error });
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/quick-audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockIsValidEmail.mockReturnValue(true);
    // Default: no existing email, insert succeeds
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "email_captures") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.limit = vi.fn().mockResolvedValue({ data: [], error: null });
        c.insert = vi.fn().mockResolvedValue({ error: null });
        return c;
      }
      return makeInsertChain();
    });
  });

  it("returns 429 when IP rate limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 when email is invalid", async () => {
    mockIsValidEmail.mockReturnValue(false);
    const res = await POST(makePost({ ...VALID_BODY, email: "bad" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 429 when email rate limited (second check)", async () => {
    mockIsRateLimited
      .mockResolvedValueOnce(false) // IP check passes
      .mockResolvedValueOnce(true); // email check fails
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/already submitted/i);
  });

  it("returns 200 with alreadySubscribed when email already exists", async () => {
    mockAdminFrom.mockReturnValue(makeSelectChain([{ id: 1 }]));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alreadySubscribed).toBe(true);
  });

  it("returns 200 and inserts new email capture on success", async () => {
    const insertChain = makeInsertChain();
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "email_captures") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.limit = vi.fn().mockResolvedValue({ data: [], error: null });
        c.insert = (insertChain as Record<string, unknown>).insert as typeof vi.fn;
        return c;
      }
      return makeInsertChain();
    });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("inserts with source quick_audit", async () => {
    let insertedData: unknown;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "email_captures") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.limit = vi.fn().mockResolvedValue({ data: [], error: null });
        c.insert = vi.fn((data: unknown) => {
          insertedData = data;
          return Promise.resolve({ error: null });
        });
        return c;
      }
      return makeInsertChain();
    });
    await POST(makePost(VALID_BODY));
    expect((insertedData as Record<string, unknown>).source).toBe("quick_audit");
  });

  it("normalises email to lowercase and trims", async () => {
    let insertedData: unknown;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "email_captures") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.limit = vi.fn().mockResolvedValue({ data: [], error: null });
        c.insert = vi.fn((data: unknown) => {
          insertedData = data;
          return Promise.resolve({ error: null });
        });
        return c;
      }
      return makeInsertChain();
    });
    await POST(makePost({ ...VALID_BODY, email: "  Investor@EXAMPLE.COM  " }));
    expect((insertedData as Record<string, unknown>).email).toBe("investor@example.com");
  });

  it("returns 500 when DB insert fails", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "email_captures") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.limit = vi.fn().mockResolvedValue({ data: [], error: null });
        c.insert = vi.fn().mockResolvedValue({ error: { message: "constraint" } });
        return c;
      }
      return makeInsertChain();
    });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(makePost("not-json"));
    expect(res.status).toBe(400);
  });

  it("caps avg_trade_size context at 1,000,000", async () => {
    let insertedData: unknown;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "email_captures") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.limit = vi.fn().mockResolvedValue({ data: [], error: null });
        c.insert = vi.fn((data: unknown) => {
          insertedData = data;
          return Promise.resolve({ error: null });
        });
        return c;
      }
      return makeInsertChain();
    });
    await POST(makePost({ ...VALID_BODY, avg_trade_size: 9999999 }));
    const ctx = (insertedData as Record<string, unknown>).context as Record<string, number>;
    expect(ctx.avg_trade_size).toBe(1000000);
  });
});
