/**
 * Tests for POST /api/fixed-quotes/[token]/decline
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockDeclineQuote = vi.fn();
vi.mock("@/lib/expert-teams/fixed-quotes", () => ({
  declineQuote: (...args: unknown[]) => mockDeclineQuote(...args),
}));

import { POST } from "@/app/api/fixed-quotes/[token]/decline/route";
import type { NextRequest } from "next/server";

const VALID_TOKEN = "b".repeat(20);

function makeReq(body?: unknown, url = "http://localhost/api/fixed-quotes/sometoken/decline"): NextRequest {
  return new Request(url, {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("POST /api/fixed-quotes/[token]/decline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(), { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(429);
  });

  it("returns 400 for token that is too short", async () => {
    const res = await POST(makeReq(), { params: Promise.resolve({ token: "short" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body fails schema (reason too long)", async () => {
    const res = await POST(
      makeReq({ reason: "x".repeat(501) }),
      { params: Promise.resolve({ token: VALID_TOKEN }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when declineQuote returns null", async () => {
    mockDeclineQuote.mockResolvedValue(null);
    const res = await POST(makeReq({ reason: null }), { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(409);
  });

  it("returns 200 on successful decline", async () => {
    mockDeclineQuote.mockResolvedValue({ id: 1, brief_id: 2 });
    const res = await POST(makeReq({ reason: "Not interested" }), { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 200 on successful decline with no body", async () => {
    mockDeclineQuote.mockResolvedValue({ id: 1, brief_id: 2 });
    // No body — request.json() will throw, route handles it gracefully
    const res = await POST(makeReq(undefined), { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(200);
  });
});
