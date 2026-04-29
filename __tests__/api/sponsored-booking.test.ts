import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/sponsored-booking/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/sponsored-booking", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  name: "Jane Smith",
  email: "jane@company.com",
  company: "ACME Corp",
  package: "sponsored-article",
  phone: "0412345678",
  message: "Interested in Q1 slot",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/sponsored-booking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockSendEmail.mockResolvedValue({ id: "email-123" });
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("scopes rate-limit key to IP", async () => {
    mockIsRateLimited.mockResolvedValue(false);
    mockSendEmail.mockResolvedValue({ id: "x" });
    await POST(makePost(VALID_BODY, "5.6.7.8"));
    expect(mockIsRateLimited).toHaveBeenCalledWith("sponsored-booking:5.6.7.8", 5, 5);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, name: undefined }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/name/i);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, email: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when company is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, company: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when package is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, package: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid package value", async () => {
    const res = await POST(makePost({ ...VALID_BODY, package: "unknown-package" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid package/i);
  });

  it.each(["sponsored-article", "calculator-sponsorship", "directory-feature"])(
    "accepts valid package %s and returns 200",
    async (pkg) => {
      mockSendEmail.mockResolvedValue({ id: "x" });
      const res = await POST(makePost({ ...VALID_BODY, package: pkg }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    },
  );

  it("sends admin notification email with company + package label in subject", async () => {
    await POST(makePost(VALID_BODY));
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0]![0] as { subject: string; to: string };
    expect(call.to).toBe("admin@invest.com.au");
    expect(call.subject).toContain("ACME Corp");
    expect(call.subject).toContain("Sponsored Article");
  });

  it("returns 500 when sendEmail throws", async () => {
    mockSendEmail.mockRejectedValue(new Error("Resend down"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("includes phone in email HTML when provided", async () => {
    await POST(makePost(VALID_BODY));
    const html = (mockSendEmail.mock.calls[0]![0] as { html: string }).html;
    expect(html).toContain("0412345678");
  });

  it("omits phone row from HTML when phone is absent", async () => {
    const { phone: _phone, ...noPhone } = VALID_BODY;
    await POST(makePost(noPhone));
    const html = (mockSendEmail.mock.calls[0]![0] as { html: string }).html;
    expect(html).not.toContain("Phone");
  });
});
