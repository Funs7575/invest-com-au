import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockIsAllowed = vi.hoisted(() => vi.fn<() => Promise<boolean>>(() => Promise.resolve(true)));
const mockIsValidEmail = vi.hoisted(() => vi.fn<(e: string) => boolean>(() => true));
const mockIsDisposableEmail = vi.hoisted(() => vi.fn<(e: string) => boolean>(() => false));
const mockInsert = vi.hoisted(() => vi.fn(() => Promise.resolve({ error: null as { message: string } | null })));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: () => mockIsAllowed(),
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (e: string) => mockIsValidEmail(e),
  isDisposableEmail: (e: string) => mockIsDisposableEmail(e),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ id: "e1", ok: true })),
}));

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({ insert: mockInsert })),
  })),
}));

import { POST } from "@/app/api/business-finance/enquiry/route";
import { sendEmail } from "@/lib/resend";

// ─── Helpers ──────────────────────────────────────────────────────────

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/business-finance/enquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    business_name: "Acme Pty Ltd",
    contact_name: "Jane Smith",
    email: "jane@acme.com.au",
    finance_type: "business_loan",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("POST /api/business-finance/enquiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockIsValidEmail.mockReturnValue(true);
    mockIsDisposableEmail.mockReturnValue(false);
    mockInsert.mockResolvedValue({ error: null });
    vi.mocked(sendEmail).mockResolvedValue({ ok: true });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/business-finance/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/invalid json/i);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeReq({ business_name: "Acme" }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/invalid request/i);
  });

  it("returns 400 when finance_type is invalid enum value", async () => {
    const res = await POST(makeReq(validBody({ finance_type: "hedge_fund" })));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/invalid request/i);
  });

  it("returns 400 when email fails isValidEmail check", async () => {
    mockIsValidEmail.mockReturnValue(false);
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/valid email/i);
  });

  it("returns 400 when email is disposable", async () => {
    mockIsDisposableEmail.mockReturnValue(true);
    const res = await POST(makeReq(validBody({ email: "temp@mailinator.com" })));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/business email/i);
  });

  it("silently succeeds (honeypot) when website field is populated", async () => {
    const res = await POST(makeReq(validBody({ website: "https://spammer.com" })));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 500 on DB insert error", async () => {
    mockInsert.mockResolvedValue({ error: { message: "constraint violation" } });
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/failed to submit/i);
  });

  it("returns 200 and sends confirmation email on success", async () => {
    const res = await POST(makeReq(validBody({ loan_amount: 250_000 })));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@acme.com.au" }),
    );
  });

  it("inserts with lowercased email", async () => {
    const res = await POST(makeReq(validBody({ email: "Jane@ACME.com.au" })));
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jane@acme.com.au" }),
    );
  });

  it("converts loan_amount to loan_amount_cents", async () => {
    const res = await POST(makeReq(validBody({ loan_amount: 150_000 })));
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ loan_amount_cents: 15_000_000 }),
    );
  });

  it("converts annual_revenue to annual_revenue_cents", async () => {
    const res = await POST(makeReq(validBody({ annual_revenue: 1_000_000 })));
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ annual_revenue_cents: 100_000_000 }),
    );
  });

  it("accepts all valid finance_type enum values", async () => {
    const types = [
      "business_loan",
      "equipment_finance",
      "invoice_finance",
      "line_of_credit",
      "trade_finance",
      "other",
    ] as const;
    for (const finance_type of types) {
      mockInsert.mockResolvedValue({ error: null });
      const res = await POST(makeReq(validBody({ finance_type })));
      expect(res.status).toBe(200);
    }
  });

  it("sets status to 'new' on insert", async () => {
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "new" }),
    );
  });

  it("passes optional fields through when provided", async () => {
    const res = await POST(
      makeReq(
        validBody({
          phone: "0412 345 678",
          purpose: "Working capital",
          time_in_business_months: 36,
          message: "Need funds urgently.",
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "0412 345 678",
        purpose: "Working capital",
        time_in_business_months: 36,
        message: "Need funds urgently.",
      }),
    );
  });
});
