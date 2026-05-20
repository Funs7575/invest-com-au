/**
 * Tests for GET /api/pros/[slug]/availability
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockListAvailabilityForPro } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockListAvailabilityForPro: vi.fn(async () => []),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/consultations", () => ({
  listAvailabilityForPro: mockListAvailabilityForPro,
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/pros/[slug]/availability/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/pros/john-smith/availability", { method: "GET" });
}

function makeProChain(proData: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select","eq","in","maybeSingle","filter"]) chain[m] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: proData, error: null }));
  return chain;
}

const ctx = { params: Promise.resolve({ slug: "john-smith" }) } as Parameters<typeof GET>[1];
const emptySlugCtx = { params: Promise.resolve({ slug: "" }) } as Parameters<typeof GET>[1];
const longSlugCtx = { params: Promise.resolve({ slug: "a".repeat(201) }) } as Parameters<typeof GET>[1];

describe("GET /api/pros/[slug]/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockListAvailabilityForPro.mockResolvedValue([]);
    mockAdminFrom.mockReturnValue(makeProChain({ id: 42, name: "John Smith", slug: "john-smith" }));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 for empty slug", async () => {
    const res = await GET(makeReq(), emptySlugCtx);
    expect(res.status).toBe(400);
  });

  it("returns 400 for slug > 200 chars", async () => {
    const res = await GET(makeReq(), longSlugCtx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when pro not found", async () => {
    mockAdminFrom.mockReturnValue(makeProChain(null));
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 200 with slots and professional info", async () => {
    const slots = [{ id: 1, status: "open", start_at: "2026-06-01T09:00:00Z" }];
    mockListAvailabilityForPro.mockResolvedValue(slots);
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.professional.slug).toBe("john-smith");
    expect(Array.isArray(json.slots)).toBe(true);
    expect(json.slots).toHaveLength(1);
  });

  it("returns 200 with empty slots when pro has no availability", async () => {
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.slots).toHaveLength(0);
  });
});
