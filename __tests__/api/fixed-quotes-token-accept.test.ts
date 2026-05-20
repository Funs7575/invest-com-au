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

const acceptQuoteMock = vi.fn();
vi.mock("@/lib/expert-teams/fixed-quotes", () => ({
  acceptQuote: (...a: unknown[]) => acceptQuoteMock(...a),
}));

import { POST } from "@/app/api/fixed-quotes/[token]/accept/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_TOKEN = "a".repeat(32);

function makeReq(
  token = VALID_TOKEN,
  ip = "1.2.3.4",
): [NextRequest, { params: Promise<{ token: string }> }] {
  const req = new NextRequest(`http://localhost/api/fixed-quotes/${token}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
  });
  return [req, { params: Promise.resolve({ token }) }];
}

const QUOTE_ROW = { id: 7, brief_id: 99, status: "accepted" };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/fixed-quotes/[token]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
    acceptQuoteMock.mockResolvedValue(QUOTE_ROW);
  });

  it("returns 429 when rate limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
    expect(acceptQuoteMock).not.toHaveBeenCalled();
  });

  it("returns 400 when token is too short", async () => {
    const [req, ctx] = makeReq("short");
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid token/i);
    expect(acceptQuoteMock).not.toHaveBeenCalled();
  });

  it("returns 400 when token is too long", async () => {
    const [req, ctx] = makeReq("z".repeat(81));
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect(acceptQuoteMock).not.toHaveBeenCalled();
  });

  it("returns 409 when the quote is no longer acceptable", async () => {
    acceptQuoteMock.mockResolvedValueOnce(null);
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/no longer acceptable/i);
  });

  it("returns 200 with success on a valid accept", async () => {
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(acceptQuoteMock).toHaveBeenCalledWith(VALID_TOKEN);
  });

  it("returns 500 when acceptQuote throws", async () => {
    acceptQuoteMock.mockRejectedValueOnce(new Error("boom"));
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to accept/i);
  });
});
