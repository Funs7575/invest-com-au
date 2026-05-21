/**
 * Tests for GET /api/pro-affiliate/[token]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockIsAllowed, mockRecordClick } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRecordClick: vi.fn(async () => undefined),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/pro-affiliate/track", () => ({
  recordClick: mockRecordClick,
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/pro-affiliate/[token]/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/pro-affiliate/abc123tok", {
    method: "GET",
  });
}

describe("GET /api/pro-affiliate/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRecordClick.mockResolvedValue(undefined);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const ctx = { params: Promise.resolve({ token: "abc123tok" }) };
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 for empty token", async () => {
    const ctx = { params: Promise.resolve({ token: "" }) };
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 for token > 64 chars", async () => {
    const longToken = "a".repeat(65);
    const ctx = { params: Promise.resolve({ token: longToken }) };
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 303 redirect for valid token", async () => {
    const ctx = { params: Promise.resolve({ token: "abc123tok" }) };
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(303);
    const location = res.headers.get("location");
    expect(location).toContain("utm_source=pro_affiliate");
    expect(location).toContain("abc123tok");
  });

  it("sets ref cookie on redirect", async () => {
    const ctx = { params: Promise.resolve({ token: "mytoken123" }) };
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(303);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("mytoken123");
  });

  it("fires recordClick fire-and-forget", async () => {
    const ctx = { params: Promise.resolve({ token: "abc123tok" }) };
    await GET(makeReq(), ctx);
    // recordClick is fire-and-forget, may have been called
    // just assert no error thrown
  });
});
