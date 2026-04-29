import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: string) => s,
}));

const mockSendEmail = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "email-123" }));
vi.mock("@/lib/resend", () => ({
  sendEmail: mockSendEmail,
}));

const mockIsRateLimited = vi.hoisted(() => vi.fn<() => Promise<boolean>>().mockResolvedValue(false));
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

import { POST } from "@/app/api/send-switching-report/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const BASE_BODY = {
  email: "user@example.com",
  currentBroker: "CommSec",
  currentBrokerSlug: "commsec",
  cheapestBroker: "SelfWealth",
  cheapestBrokerSlug: "selfwealth",
  currentCost: 1200,
  cheapestCost: 340,
  savings: 860,
  tradesPerYear: 40,
  avgTradeSize: 3000,
  usAllocation: 20,
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/send-switching-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/send-switching-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockSendEmail.mockResolvedValue({ id: "email-123" }); // reset after clearAllMocks
    process.env.NEXT_PUBLIC_SITE_URL = "https://invest.com.au";
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeRequest(BASE_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/Too many/i);
  });

  it("returns 400 when email is missing", async () => {
    const { email: _e, ...bodyNoEmail } = BASE_BODY;
    const res = await POST(makeRequest(bodyNoEmail));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing required/i);
  });

  it("returns 400 when currentBroker is missing", async () => {
    const { currentBroker: _c, ...bodyNoBroker } = BASE_BODY;
    const res = await POST(makeRequest(bodyNoBroker));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing required/i);
  });

  it("returns 400 when cheapestBroker is missing", async () => {
    const { cheapestBroker: _c, ...bodyNoCheap } = BASE_BODY;
    const res = await POST(makeRequest(bodyNoCheap));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing required/i);
  });

  it("returns 200 and calls sendEmail on success", async () => {
    const res = await POST(makeRequest(BASE_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it("email subject contains savings amount", async () => {
    await POST(makeRequest(BASE_BODY));
    const call = mockSendEmail.mock.calls[0]![0] as { subject: string; html: string };
    expect(call.subject).toContain("860");
    expect(call.subject).toContain("SelfWealth");
  });

  it("email contains broker name comparison in HTML body", async () => {
    await POST(makeRequest(BASE_BODY));
    const call = mockSendEmail.mock.calls[0]![0] as { subject: string; html: string };
    expect(call.html).toContain("CommSec");
    expect(call.html).toContain("SelfWealth");
  });

  it("email HTML includes savings highlight when savings > 0", async () => {
    await POST(makeRequest(BASE_BODY));
    const call = mockSendEmail.mock.calls[0]![0] as { subject: string; html: string };
    expect(call.html).toContain("$860");
  });

  it("returns 500 when sendEmail throws", async () => {
    mockSendEmail.mockRejectedValue(new Error("Resend API down"));
    const res = await POST(makeRequest(BASE_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to send/i);
  });

  it("affiliate link in email uses cheapestBrokerSlug", async () => {
    await POST(makeRequest(BASE_BODY));
    const call = mockSendEmail.mock.calls[0]![0] as { html: string };
    expect(call.html).toContain("/go/selfwealth");
    expect(call.html).toContain("utm_source=switching_report");
  });

  it("rate-limit key includes IP from x-forwarded-for", async () => {
    mockIsRateLimited.mockResolvedValue(false);
    const req = new NextRequest("http://localhost/api/send-switching-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      },
      body: JSON.stringify(BASE_BODY),
    });
    await POST(req);
    expect(mockIsRateLimited).toHaveBeenCalledWith(
      "switch-report:1.2.3.4",
      expect.any(Number),
      expect.any(Number)
    );
  });
});
