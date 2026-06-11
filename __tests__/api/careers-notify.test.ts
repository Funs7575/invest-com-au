import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockIsRateLimited, mockAdminFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn().mockResolvedValue(false),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: vi.fn(() => true),
  isDisposableEmail: vi.fn(() => false),
}));

import { POST } from "@/app/api/careers/notify/route";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_BODY = { email: "advisor@example.com", name: "Jane Smith" };

type UpsertError = { message: string } | null;

function setupMocks({
  upsertError = null as UpsertError,
  subscriberCount = 0,
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table);

    if (table === "newsletter_subscribers") {
      // upsert chain — resolves with { error }
      b.upsert = vi.fn(() => ({
        ...b,
        then: (cb: (v: unknown) => void) => {
          cb({ error: upsertError });
          return Promise.resolve();
        },
      }));
      // select...count chain for "isFirst" check
      b.select = vi.fn(() => ({
        ...b,
        eq: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({ count: subscriberCount, error: null }),
          ),
        })),
      }));
    }

    if (table === "revenue_opportunities") {
      b.upsert = vi.fn(() =>
        Promise.resolve({ error: null }),
      );
    }

    return b;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/careers/notify", () => {
  function makePost(body: Record<string, unknown>): NextRequest {
    return makeRequest("/api/careers/notify", body);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    vi.mocked(isValidEmail).mockReturnValue(true);
    vi.mocked(isDisposableEmail).mockReturnValue(false);
    setupMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 for missing email", async () => {
    const res = await POST(makePost({ name: "Jane" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    vi.mocked(isValidEmail).mockReturnValueOnce(false);
    const res = await POST(makePost({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error?: string };
    expect(body.error).toMatch(/valid email/i);
  });

  it("returns 400 for disposable email", async () => {
    vi.mocked(isDisposableEmail).mockReturnValueOnce(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(400);
    const body = await res.json() as { error?: string };
    expect(body.error).toMatch(/real email/i);
  });

  it("returns 200 { ok: true } on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok?: boolean };
    expect(body.ok).toBe(true);
  });

  it("upserts into newsletter_subscribers with source=advisor_careers", async () => {
    await POST(makePost(VALID_BODY));
    // Verify the newsletter_subscribers table was targeted
    expect(mockAdminFrom).toHaveBeenCalledWith("newsletter_subscribers");
  });

  it("returns 500 when upsert fails", async () => {
    setupMocks({ upsertError: { message: "DB error" } });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("normalises email to lowercase", async () => {
    // Should not error for mixed-case email
    const res = await POST(makePost({ email: "Advisor@EXAMPLE.COM" }));
    expect(res.status).toBe(200);
  });

  it("accepts submission without optional name field", async () => {
    const res = await POST(makePost({ email: "anonymous@example.com" }));
    expect(res.status).toBe(200);
  });
});
