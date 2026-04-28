import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

const mockEnqueueJob = vi.fn();
vi.mock("@/lib/job-queue", () => ({
  enqueueJob: (...args: unknown[]) => mockEnqueueJob(...args),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
}));

import { POST } from "@/app/api/privacy/correct/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/privacy/correct", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
    body: JSON.stringify(body),
  });
}

function mockInsert(error: unknown = null) {
  mockAdminFrom.mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error }),
  });
}

const VALID_BODY = {
  email: "user@example.com",
  field: "name",
  new_value: "Jane Doe",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/privacy/correct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockInsert();
    mockEnqueueJob.mockResolvedValue(undefined);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(makePost({ ...VALID_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid email/i);
  });

  it("returns 400 when email is missing", async () => {
    const { email: _, ...noEmail } = VALID_BODY;
    const res = await POST(makePost(noEmail));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid email/i);
  });

  it("returns 400 when field is not in the allowlist", async () => {
    const res = await POST(makePost({ ...VALID_BODY, field: "credit_card_number" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/not correctable/i);
  });

  it("returns 400 when new_value is empty", async () => {
    const res = await POST(makePost({ ...VALID_BODY, new_value: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/1 and 200/i);
  });

  it("returns 400 when new_value exceeds 200 characters", async () => {
    const res = await POST(makePost({ ...VALID_BODY, new_value: "x".repeat(201) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/1 and 200/i);
  });

  it("returns 200 even when DB insert fails (soft fallback — logs warn)", async () => {
    mockInsert({ message: "constraint violation" });
    const res = await POST(makePost(VALID_BODY));
    // Soft fallback: the route still returns 200 and enqueues the email
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 200 and enqueues a send_email job on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockEnqueueJob).toHaveBeenCalledWith(
      "send_email",
      expect.objectContaining({ to: "user@example.com" }),
    );
  });

  it("includes the privacy verify URL in the enqueued email body", async () => {
    await POST(makePost(VALID_BODY));
    const [, emailPayload] = mockEnqueueJob.mock.calls[0]!;
    expect((emailPayload as { html: string }).html).toContain(
      "https://invest.com.au/api/privacy/verify",
    );
  });

  it("accepts all three correctable fields without error", async () => {
    for (const field of ["name", "phone", "preference_cadence"]) {
      vi.clearAllMocks();
      mockIsAllowed.mockResolvedValue(true);
      mockInsert();
      mockEnqueueJob.mockResolvedValue(undefined);
      const res = await POST(makePost({ ...VALID_BODY, field }));
      expect(res.status).toBe(200);
    }
  });
});
