/* eslint-disable @typescript-eslint/no-explicit-any -- test ctx/param casts */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockGetLinkByToken,
  mockRecordClick,
} = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockGetLinkByToken: vi.fn(async () => ({
    token: "abcdefgh12345678",
    investor_id: "u1",
  })),
  mockRecordClick: vi.fn(async () => undefined),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/investor-referrals", () => ({
  getLinkByToken: mockGetLinkByToken,
  recordClick: mockRecordClick,
}));

import { GET } from "@/app/api/ref/[token]/route";

function makeReq(url = "http://localhost/api/ref/abcdefgh12345678"): NextRequest {
  return new Request(url, { method: "GET" }) as unknown as NextRequest;
}

function makeCtx(token: string) {
  return { params: Promise.resolve({ token }) };
}

describe("/api/ref/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetLinkByToken.mockResolvedValue({ token: "abcdefgh12345678", investor_id: "u1" });
    mockRecordClick.mockResolvedValue(undefined);
  });

  it("redirects with 303 when token is valid", async () => {
    const res = await GET(makeReq(), makeCtx("abcdefgh12345678") as any);
    expect(res.status).toBe(303);
    const location = res.headers.get("location");
    expect(location).toContain("utm_source=investor_referral");
  });

  it("redirects to / when token is too short (< 8 chars)", async () => {
    const res = await GET(makeReq("http://localhost/api/ref/abc"), makeCtx("abc") as any);
    expect(res.status).toBe(303);
  });

  it("redirects to / when token is too long (> 32 chars)", async () => {
    const longToken = "a".repeat(33);
    const res = await GET(makeReq(`http://localhost/api/ref/${longToken}`), makeCtx(longToken) as any);
    expect(res.status).toBe(303);
  });

  it("redirects to / when link not found", async () => {
    mockGetLinkByToken.mockResolvedValue(null);
    const res = await GET(makeReq(), makeCtx("abcdefgh12345678") as any);
    expect(res.status).toBe(303);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq(), makeCtx("abcdefgh12345678") as any);
    expect(res.status).toBe(429);
  });

  it("sets iv_ref cookie on successful redirect", async () => {
    const res = await GET(makeReq(), makeCtx("abcdefgh12345678") as any);
    expect(res.status).toBe(303);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("iv_ref");
  });
});