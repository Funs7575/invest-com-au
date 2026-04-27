import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { makeRequest } from "@/__tests__/helpers";

// ── Module-level mock state ───────────────────────────────────────────────────

let emailCapturesInsertError: { message?: string; code?: string } | null = null;
const emailCapturesInsertCalls: Record<string, unknown>[] = [];

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn((table: string) => {
  if (table === "email_captures") {
    return {
      insert: vi.fn((row: Record<string, unknown>) => {
        emailCapturesInsertCalls.push(row);
        return Promise.resolve({ data: null, error: emailCapturesInsertError });
      }),
    };
  }
  return {
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/validate-phone", () => ({
  isValidAuPhone: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/posthog/server", () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Import after mocks
import { POST } from "@/app/api/advisor-lead/route";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validate-email";
import { isValidAuPhone } from "@/lib/validate-phone";

// ── Helpers ───────────────────────────────────────────────────────────────────

function advisorRequest(
  body: Record<string, unknown>,
  ip = "10.0.0.1",
): ReturnType<typeof makeRequest> {
  return makeRequest("/api/advisor-lead", body, { ip });
}

const VALID_DOMESTIC_BODY = {
  name: "Jane Smith",
  phone: "0412345678",
  email: "jane@example.com",
  advisor_type: "financial-planner",
  quiz_answers: { experience: "beginner", goal: "retire" },
  consent: true,
};

const VALID_INTL_BODY = {
  name: "Li Wei",
  phone: "+8613812345678",
  email: "liwei@example.com",
  advisor_type: "financial-planner",
  quiz_answers: { goal: "buy property" },
  consent: true,
  is_international: true,
  investor_country: "China",
  visa_status: "Student visa",
  investor_goal_intl: "Purchase PPOR",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-lead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emailCapturesInsertCalls.length = 0;
    emailCapturesInsertError = null;

    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (isValidEmail as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (isValidAuPhone as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ── Input validation ─────────────────────────────────────────────────────

  it("returns 400 for invalid JSON body", async () => {
    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost/api/advisor-lead", {
      method: "POST",
      body: "{bad-json",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(advisorRequest({ ...VALID_DOMESTIC_BODY, name: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/name/i);
  });

  it("returns 400 when name is a single character (< 2 after trim)", async () => {
    const res = await POST(advisorRequest({ ...VALID_DOMESTIC_BODY, name: "J" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/name/i);
  });

  it("returns 400 for domestic lead when AU phone is invalid", async () => {
    (isValidAuPhone as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const res = await POST(advisorRequest({ ...VALID_DOMESTIC_BODY, phone: "99999" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/phone/i);
  });

  it("returns 400 for domestic lead when phone is missing", async () => {
    (isValidAuPhone as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const res = await POST(advisorRequest({ ...VALID_DOMESTIC_BODY, phone: undefined }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/phone/i);
  });

  it("returns 400 for international lead when phone is too short (< 6 chars)", async () => {
    const res = await POST(advisorRequest({ ...VALID_INTL_BODY, phone: "12 3" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/phone/i);
  });

  it("returns 400 when email is invalid", async () => {
    (isValidEmail as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const res = await POST(advisorRequest({ ...VALID_DOMESTIC_BODY, email: "notanemail" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/i);
  });

  it("returns 400 when consent is false", async () => {
    const res = await POST(advisorRequest({ ...VALID_DOMESTIC_BODY, consent: false }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/consent/i);
  });

  it("returns 400 when consent is absent", async () => {
    const res = await POST(advisorRequest({ ...VALID_DOMESTIC_BODY, consent: undefined }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/consent/i);
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when IP is rate-limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(advisorRequest(VALID_DOMESTIC_BODY));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many/i);
  });

  it("keys the rate-limit check on the x-forwarded-for IP", async () => {
    await POST(advisorRequest(VALID_DOMESTIC_BODY, "203.0.113.7"));
    expect(isRateLimited).toHaveBeenCalledWith(
      expect.stringContaining("203.0.113.7"),
      expect.any(Number),
      expect.any(Number),
    );
  });

  // ── Domestic lead success ─────────────────────────────────────────────────

  it("returns 200 and inserts domestic lead into email_captures", async () => {
    const res = await POST(advisorRequest(VALID_DOMESTIC_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(emailCapturesInsertCalls).toHaveLength(1);
    const row = emailCapturesInsertCalls[0] as Record<string, unknown>;
    expect(row.email).toBe("jane@example.com");
    expect(row.source).toBe("advisor-lead");
    const ctx = row.context as Record<string, unknown>;
    expect(ctx.is_international).toBe(false);
    expect(ctx.lead_tier).toBeUndefined();
    expect(ctx.advisor_type).toBe("financial-planner");
  });

  // ── International lead success ────────────────────────────────────────────

  it("returns 200 and records international context in email_captures", async () => {
    const res = await POST(advisorRequest(VALID_INTL_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const row = emailCapturesInsertCalls[0] as Record<string, unknown>;
    expect(row.source).toBe("advisor-lead-international");
    const ctx = row.context as Record<string, unknown>;
    expect(ctx.is_international).toBe(true);
    expect(ctx.investor_country).toBe("China");
    expect(ctx.visa_status).toBe("Student visa");
    expect(ctx.investor_goal_intl).toBe("Purchase PPOR");
    expect(ctx.lead_tier).toBe("international");
  });

  it("skips AU phone validation for international leads", async () => {
    (isValidAuPhone as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const res = await POST(advisorRequest({ ...VALID_INTL_BODY, phone: "+12025550199" }));
    expect(res.status).toBe(200);
  });

  // ── DB error handling ──────────────────────────────────────────────────────

  it("returns 500 on non-duplicate DB insert error", async () => {
    emailCapturesInsertError = { message: "relation does not exist", code: "42P01" };
    const res = await POST(advisorRequest(VALID_DOMESTIC_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed/i);
  });

  it("returns 200 on duplicate-key error (code 23505) — duplicate email still fires notification", async () => {
    emailCapturesInsertError = { code: "23505" };
    const res = await POST(advisorRequest(VALID_DOMESTIC_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns 200 on duplicate error identified by message text", async () => {
    emailCapturesInsertError = { message: "duplicate key value violates unique constraint" };
    const res = await POST(advisorRequest(VALID_DOMESTIC_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  // ── Input sanitisation ────────────────────────────────────────────────────

  it("truncates name to 100 chars and trims whitespace", async () => {
    const longName = "  " + "A".repeat(150) + "  ";
    await POST(advisorRequest({ ...VALID_DOMESTIC_BODY, name: longName }));
    const row = emailCapturesInsertCalls[0] as Record<string, unknown>;
    expect(typeof row.name).toBe("string");
    expect((row.name as string).length).toBeLessThanOrEqual(100);
    expect((row.name as string)[0]).not.toBe(" ");
  });

  it("defaults advisor_type to 'not-sure' when omitted", async () => {
    await POST(advisorRequest({ ...VALID_DOMESTIC_BODY, advisor_type: undefined }));
    const row = emailCapturesInsertCalls[0] as Record<string, unknown>;
    const ctx = row.context as Record<string, unknown>;
    expect(ctx.advisor_type).toBe("not-sure");
  });

  it("defaults quiz_answers to empty object when omitted", async () => {
    await POST(advisorRequest({ ...VALID_DOMESTIC_BODY, quiz_answers: undefined }));
    const row = emailCapturesInsertCalls[0] as Record<string, unknown>;
    const ctx = row.context as Record<string, unknown>;
    expect(ctx.quiz_answers).toEqual({});
  });
});
