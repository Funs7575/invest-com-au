/**
 * Tests for POST /api/fixed-quotes/[token]/accept
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockAcceptQuote = vi.fn();
vi.mock("@/lib/expert-teams/fixed-quotes", () => ({
  acceptQuote: (...args: unknown[]) => mockAcceptQuote(...args),
}));

import { POST } from "@/app/api/fixed-quotes/[token]/accept/route";
import type { NextRequest } from "next/server";

function makeReq(url = "http://localhost/api/fixed-quotes/sometoken/accept"): NextRequest {
  return new Request(url, { method: "POST" }) as unknown as NextRequest;
}

const VALID_TOKEN = "a".repeat(20); // 20 chars — passes 16-80 check

describe("POST /api/fixed-quotes/[token]/accept", () => {
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

  it("returns 400 for token that is too long", async () => {
    const res = await POST(makeReq(), { params: Promise.resolve({ token: "x".repeat(81) }) });
    expect(res.status).toBe(400);
  });

  it("returns 409 when acceptQuote returns null (already actioned)", async () => {
    mockAcceptQuote.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(409);
  });

  it("returns 200 when quote is accepted successfully", async () => {
    mockAcceptQuote.mockResolvedValue({ id: 1, brief_id: 2 });
    const res = await POST(makeReq(), { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when acceptQuote throws", async () => {
    mockAcceptQuote.mockRejectedValue(new Error("db error"));
    const res = await POST(makeReq(), { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(500);
  });
});
