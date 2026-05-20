import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: () => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const declineQuoteMock = vi.fn();
vi.mock("@/lib/expert-teams/fixed-quotes", () => ({
  declineQuote: (...a: unknown[]) => declineQuoteMock(...a),
}));

import { POST } from "@/app/api/fixed-quotes/[token]/decline/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_TOKEN = "b".repeat(32);

function makeReq(
  body: unknown,
  token = VALID_TOKEN,
  ip = "1.2.3.4",
): [NextRequest, { params: Promise<{ token: string }> }] {
  const req = new NextRequest(`http://localhost/api/fixed-quotes/${token}/decline`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ token }) }];
}

const QUOTE_ROW = { id: 7, brief_id: 99, status: "declined" };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/fixed-quotes/[token]/decline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
    declineQuoteMock.mockResolvedValue(QUOTE_ROW);
  });

  it("returns 429 when rate limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const [req, ctx] = makeReq({ reason: "too expensive" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
    expect(declineQuoteMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the token is invalid", async () => {
    const [req, ctx] = makeReq({ reason: "x" }, "short");
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect(declineQuoteMock).not.toHaveBeenCalled();
  });

  it("returns 400 when reason exceeds the max length", async () => {
    const [req, ctx] = makeReq({ reason: "r".repeat(501) });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect(declineQuoteMock).not.toHaveBeenCalled();
  });

  it("tolerates an unparseable body and declines with a null reason", async () => {
    const req = new NextRequest(`http://localhost/api/fixed-quotes/${VALID_TOKEN}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req, { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(200);
    expect(declineQuoteMock).toHaveBeenCalledWith(VALID_TOKEN, null);
  });

  it("returns 409 when the quote is no longer declinable", async () => {
    declineQuoteMock.mockResolvedValueOnce(null);
    const [req, ctx] = makeReq({ reason: "changed my mind" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/no longer declinable/i);
  });

  it("returns 200 and forwards the reason on a valid decline", async () => {
    const [req, ctx] = makeReq({ reason: "found a cheaper option" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(declineQuoteMock).toHaveBeenCalledWith(VALID_TOKEN, "found a cheaper option");
  });

  it("returns 500 when declineQuote throws", async () => {
    declineQuoteMock.mockRejectedValueOnce(new Error("db down"));
    const [req, ctx] = makeReq({ reason: "x" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to decline/i);
  });
});
