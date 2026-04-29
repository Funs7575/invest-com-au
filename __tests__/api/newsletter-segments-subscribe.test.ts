import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._args: unknown[]) => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const mockSubscribeToNewsletter = vi.fn();
vi.mock("@/lib/newsletter", () => ({
  subscribeToNewsletter: (...args: unknown[]) => mockSubscribeToNewsletter(...args),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

import { POST } from "@/app/api/newsletter-segments/subscribe/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/newsletter-segments/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/newsletter-segments/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    isAllowedMock.mockResolvedValue(false);
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ segment: "investing" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing email/i);
  });

  it("returns 400 when subscribeToNewsletter returns error", async () => {
    mockSubscribeToNewsletter.mockResolvedValue({ ok: false, error: "Disposable email" });

    const res = await POST(makeRequest({ email: "user@mailinator.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Disposable email");
  });

  it("returns already_confirmed message without sending email", async () => {
    mockSubscribeToNewsletter.mockResolvedValue({ ok: true, alreadyConfirmed: true });

    const res = await POST(makeRequest({ email: "user@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.already_confirmed).toBe(true);
    expect(body.ok).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends confirmation email when token is present", async () => {
    mockSubscribeToNewsletter.mockResolvedValue({
      ok: true,
      alreadyConfirmed: false,
      confirmationToken: "tok-abc-123",
    });
    mockSendEmail.mockResolvedValue({ id: "email-sent" });

    const res = await POST(makeRequest({ email: "user@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toMatch(/check your inbox/i);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArgs = mockSendEmail.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.to).toBe("user@example.com");
    expect(String(callArgs.html)).toContain("tok-abc-123");
  });

  it("includes segment name in confirmation email when provided", async () => {
    mockSubscribeToNewsletter.mockResolvedValue({
      ok: true,
      alreadyConfirmed: false,
      confirmationToken: "tok-xyz",
    });
    mockSendEmail.mockResolvedValue({ id: "sent" });

    await POST(makeRequest({ email: "user@example.com", segment: "smsf" }));

    const callArgs = mockSendEmail.mock.calls[0][0] as Record<string, unknown>;
    expect(String(callArgs.html)).toContain("smsf");
  });

  it("continues even if confirmation email send fails", async () => {
    mockSubscribeToNewsletter.mockResolvedValue({
      ok: true,
      alreadyConfirmed: false,
      confirmationToken: "tok-fail",
    });
    mockSendEmail.mockRejectedValue(new Error("Resend is down"));

    const res = await POST(makeRequest({ email: "user@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 200 with no email when no confirmation token returned", async () => {
    mockSubscribeToNewsletter.mockResolvedValue({
      ok: true,
      alreadyConfirmed: false,
      confirmationToken: undefined,
    });

    const res = await POST(makeRequest({ email: "user@example.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("handles invalid JSON body gracefully by using empty object", async () => {
    mockSubscribeToNewsletter.mockResolvedValue({ ok: false, error: "Invalid" });

    const req = new NextRequest("http://localhost/api/newsletter-segments/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "broken json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing email/i);
  });
});
