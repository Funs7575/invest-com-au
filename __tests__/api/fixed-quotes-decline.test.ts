import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { isAllowedMock, ipKeyMock, declineQuoteMock } = vi.hoisted(() => ({
  isAllowedMock: vi.fn(() => Promise.resolve(true)),
  ipKeyMock: vi.fn(() => "ip:1.2.3.4"),
  declineQuoteMock: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: isAllowedMock, ipKey: ipKeyMock }));
vi.mock("@/lib/expert-teams/fixed-quotes", () => ({ declineQuote: declineQuoteMock }));

import { POST } from "@/app/api/fixed-quotes/[token]/decline/route";

const VALID_TOKEN = "b".repeat(32);

function req(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/fixed-quotes/x/decline", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4", "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
const ctx = (token: string) => ({ params: Promise.resolve({ token }) });

describe("POST /api/fixed-quotes/[token]/decline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const res = await POST(req({ reason: "x" }), ctx(VALID_TOKEN));
    expect(res.status).toBe(429);
    expect(declineQuoteMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid (too short) token", async () => {
    const res = await POST(req({ reason: "x" }), ctx("short"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid token." });
    expect(declineQuoteMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a token that is too long", async () => {
    const res = await POST(req({ reason: "x" }), ctx("z".repeat(81)));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the body fails zod validation", async () => {
    const res = await POST(req({ reason: "x".repeat(501) }), ctx(VALID_TOKEN));
    expect(res.status).toBe(400);
    expect(declineQuoteMock).not.toHaveBeenCalled();
  });

  it("declines with a reason and returns success", async () => {
    declineQuoteMock.mockResolvedValueOnce({ id: 9, brief_id: 3 });
    const res = await POST(req({ reason: "too expensive" }), ctx(VALID_TOKEN));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(declineQuoteMock).toHaveBeenCalledWith(VALID_TOKEN, "too expensive");
  });

  it("treats a missing/unparseable body as a null reason", async () => {
    declineQuoteMock.mockResolvedValueOnce({ id: 9, brief_id: 3 });
    const res = await POST(req(), ctx(VALID_TOKEN));
    expect(res.status).toBe(200);
    expect(declineQuoteMock).toHaveBeenCalledWith(VALID_TOKEN, null);
  });

  it("returns 409 when the quote is no longer declinable", async () => {
    declineQuoteMock.mockResolvedValueOnce(null);
    const res = await POST(req({ reason: "x" }), ctx(VALID_TOKEN));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("no longer declinable");
  });

  it("returns 500 when declineQuote throws", async () => {
    declineQuoteMock.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(req({ reason: "x" }), ctx(VALID_TOKEN));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to decline." });
  });
});
