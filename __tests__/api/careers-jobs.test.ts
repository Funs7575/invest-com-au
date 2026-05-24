import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Hoisted mocks (avoid vi.mock() hoisting TDZ) ─────────────────────────────

const { mockIsRateLimited, mockServerFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn().mockResolvedValue(false),
  mockServerFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockServerFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { GET } from "@/app/api/careers/jobs/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/careers/jobs");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

const JOBS = [
  { id: 1, title: "Senior Advisor", location: "Sydney", type: "full_time", status: "active" },
];

function setupJobsQuery(
  jobs = JOBS,
  error: { message: string } | null = null,
) {
  const b = createChainableBuilder("job_posts");
  b.then = vi.fn((cb: (v: unknown) => void) => {
    cb({ data: error ? null : jobs, error, count: error ? null : jobs.length });
    return Promise.resolve();
  });
  mockServerFrom.mockReturnValue(b);
  return b;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/careers/jobs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 500 on DB error", async () => {
    setupJobsQuery([], { message: "connection refused" });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("returns paginated job list with defaults (page=1, limit=20)", async () => {
    setupJobsQuery(JOBS);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.jobs).toHaveLength(1);
    expect(json.total).toBe(1);
    expect(json.page).toBe(1);
    expect(json.limit).toBe(20);
  });

  it("clamps limit to 50 for oversized params", async () => {
    setupJobsQuery([]);
    const res = await GET(makeGet({ limit: "999" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.limit).toBe(50);
  });

  it("defaults to page 1 for non-numeric page param", async () => {
    setupJobsQuery([]);
    const res = await GET(makeGet({ page: "abc" }));
    const json = await res.json();
    expect(json.page).toBe(1);
  });

  it("defaults to limit 20 for non-numeric limit param", async () => {
    setupJobsQuery([]);
    const res = await GET(makeGet({ limit: "bad" }));
    const json = await res.json();
    expect(json.limit).toBe(20);
  });

  it("applies eq type filter for valid employment type", async () => {
    const b = setupJobsQuery([]);
    await GET(makeGet({ type: "part_time" }));
    const typeCalls = b.eq.mock.calls.filter(([col]: unknown[]) => col === "type");
    expect(typeCalls).toHaveLength(1);
    expect(typeCalls[0]?.[1]).toBe("part_time");
  });

  it("skips type filter for unknown type param", async () => {
    const b = setupJobsQuery([]);
    await GET(makeGet({ type: "gig_economy" }));
    const typeCalls = b.eq.mock.calls.filter(([col]: unknown[]) => col === "type");
    expect(typeCalls).toHaveLength(0);
  });

  it("applies or ilike search when q param is provided", async () => {
    const b = setupJobsQuery([]);
    await GET(makeGet({ q: "mortgage" }));
    expect(b.or).toHaveBeenCalledWith(expect.stringContaining("mortgage"));
  });
});
