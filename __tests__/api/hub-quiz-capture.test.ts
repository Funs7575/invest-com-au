import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockIsAllowed, mockIsValidEmail, mockIsDisposableEmail, mockAdminFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true),
  mockIsValidEmail: vi.fn<(email: string) => boolean>(() => true),
  mockIsDisposableEmail: vi.fn<(email: string) => boolean>(() => false),
  mockAdminFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (_req: unknown) => "ip:test",
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (email: string) => mockIsValidEmail(email),
  isDisposableEmail: (email: string) => mockIsDisposableEmail(email),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single", "filter",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  chain.catch = () => chain;
  return chain;
}

function makeReq(body: unknown): NextRequest {
  return new Request("http://localhost/api/hub-quiz/capture", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

// ── Route under test (imported after all mocks) ───────────────────────────────
import { POST } from "@/app/api/hub-quiz/capture/route";

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/hub-quiz/capture
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/hub-quiz/capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockIsValidEmail.mockReturnValue(true);
    mockIsDisposableEmail.mockReturnValue(false);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/hub-quiz/capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json{{",
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid json/i);
  });

  it("returns 400 when hubSlug is missing (Zod required)", async () => {
    const res = await POST(makeReq({ email: "test@example.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid body/i);
  });

  it("returns 400 when hubSlug exceeds 64 chars", async () => {
    const res = await POST(makeReq({ hubSlug: "h".repeat(65) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid body/i);
  });

  it("returns 200 success when no email provided (no DB write needed)", async () => {
    const res = await POST(makeReq({ hubSlug: "investing" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Admin client should not have been used (no email = no DB write)
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 when email is provided but invalid", async () => {
    mockIsValidEmail.mockReturnValue(false);
    const res = await POST(makeReq({ hubSlug: "investing", email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/valid email/i);
  });

  it("returns 400 when email is disposable", async () => {
    mockIsValidEmail.mockReturnValue(true);
    mockIsDisposableEmail.mockReturnValue(true);
    const res = await POST(makeReq({ hubSlug: "investing", email: "test@mailinator.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/real email/i);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ hubSlug: "investing", email: "user@example.com" }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  it("returns 500 when quiz_leads insert fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: null, error: { message: "insert boom" } });
      return makeChain({ data: null, error: null });
    });
    const res = await POST(makeReq({ hubSlug: "investing", email: "user@example.com" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to save/i);
  });

  it("returns 200 on successful capture with email", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      // First call: quiz_leads insert succeeds
      if (call === 1) return makeChain({ data: null, error: null });
      // Second call: email_captures upsert
      return makeChain({ data: null, error: null });
    });
    const res = await POST(makeReq({ hubSlug: "investing", email: "user@example.com", name: "Alice" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 and includes resultKey in insert when provided", async () => {
    const insertCalls: unknown[] = [];
    mockAdminFrom.mockImplementation(() => {
      const chain = makeChain({ data: null, error: null });
      const insertFn = chain.insert as ReturnType<typeof vi.fn>;
      insertFn.mockImplementation((v: unknown) => {
        insertCalls.push(v);
        return chain;
      });
      return chain;
    });
    await POST(makeReq({
      hubSlug: "etf",
      email: "user@example.com",
      resultKey: "vanguard-etf",
      answers: { q1: "a1" },
    }));
    // The first insert should include top_match_slug
    const firstInsert = insertCalls[0] as Record<string, unknown>;
    expect(firstInsert).toBeDefined();
    expect(firstInsert?.top_match_slug).toBe("vanguard-etf");
  });

  it("normalises email to lowercase and trims whitespace", async () => {
    const insertCalls: unknown[] = [];
    let callNum = 0;
    mockAdminFrom.mockImplementation(() => {
      callNum++;
      const chain = makeChain({ data: null, error: null });
      if (callNum === 1) {
        const insertFn = chain.insert as ReturnType<typeof vi.fn>;
        insertFn.mockImplementation((v: unknown) => {
          insertCalls.push(v);
          return chain;
        });
      }
      return chain;
    });
    await POST(makeReq({ hubSlug: "broker", email: "  USER@Example.COM  " }));
    const inserted = insertCalls[0] as Record<string, unknown>;
    expect(inserted?.email).toBe("user@example.com");
  });

  it("email_captures upsert error does not bubble up (fire-and-forget)", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: null, error: null }); // quiz_leads OK
      return makeChain({ data: null, error: { message: "upsert failure" } }); // email_captures fails
    });
    // Should still return 200 — error is fire-and-forget
    const res = await POST(makeReq({ hubSlug: "investing", email: "user@example.com" }));
    expect(res.status).toBe(200);
  });
});
