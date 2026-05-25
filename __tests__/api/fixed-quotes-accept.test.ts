import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { isAllowedMock, ipKeyMock, acceptQuoteMock } = vi.hoisted(() => ({
  isAllowedMock: vi.fn(() => Promise.resolve(true)),
  ipKeyMock: vi.fn(() => "ip:1.2.3.4"),
  acceptQuoteMock: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: isAllowedMock, ipKey: ipKeyMock }));
vi.mock("@/lib/expert-teams/fixed-quotes", () => ({ acceptQuote: acceptQuoteMock }));

import { POST } from "@/app/api/fixed-quotes/[token]/accept/route";

const VALID_TOKEN = "a".repeat(32);

function req(): NextRequest {
  return new NextRequest("http://localhost/api/fixed-quotes/x/accept", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}
const ctx = (token: string) => ({ params: Promise.resolve({ token }) });

describe("POST /api/fixed-quotes/[token]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const res = await POST(req(), ctx(VALID_TOKEN));
    expect(res.status).toBe(429);
    expect(acceptQuoteMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a token that is too short", async () => {
    const res = await POST(req(), ctx("short"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid token." });
    expect(acceptQuoteMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a token that is too long", async () => {
    const res = await POST(req(), ctx("z".repeat(81)));
    expect(res.status).toBe(400);
  });

  it("accepts the quote and returns success", async () => {
    acceptQuoteMock.mockResolvedValueOnce({ id: 9, brief_id: 3 });
    const res = await POST(req(), ctx(VALID_TOKEN));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(acceptQuoteMock).toHaveBeenCalledWith(VALID_TOKEN);
  });

  it("returns 409 when the quote is no longer acceptable", async () => {
    acceptQuoteMock.mockResolvedValueOnce(null);
    const res = await POST(req(), ctx(VALID_TOKEN));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("no longer acceptable");
  });

  it("returns 500 when acceptQuote throws", async () => {
    acceptQuoteMock.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(req(), ctx(VALID_TOKEN));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to accept." });
  });
});
