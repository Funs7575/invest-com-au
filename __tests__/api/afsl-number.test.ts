import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAfslLicensee, mockIsAllowed } = vi.hoisted(() => ({
  mockGetAfslLicensee: vi.fn(),
  mockIsAllowed: vi.fn(),
}));

vi.mock("@/lib/afsl-register", async () => {
  const actual = await vi.importActual<typeof import("@/lib/afsl-register")>("@/lib/afsl-register");
  return {
    ...actual,
    getAfslLicensee: (...args: unknown[]) => mockGetAfslLicensee(...args),
  };
});

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "9.9.9.9",
}));

import { GET } from "@/app/api/afsl/[number]/route";

function ctx(number: string) {
  return { params: Promise.resolve({ number }) };
}

const LICENSEE = {
  afsl_number: "240813",
  licensee_name: "Macquarie Equities Limited",
  status: "current",
  licence_conditions: null,
  address: null,
  effective_date: null,
  cancelled_date: null,
  last_verified_at: "2026-05-01T00:00:00Z",
  source: "asic_connect",
};

describe("GET /api/afsl/[number]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 with a stable error shape when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(new Request("http://x"), ctx("240813"));
    expect(res.status).toBe(429);
    expect((await res.json() as { error: string }).error).toMatch(/rate limit/i);
    expect(mockGetAfslLicensee).not.toHaveBeenCalled();
  });

  it("returns 400 when the param normalises to no digits", async () => {
    const res = await GET(new Request("http://x"), ctx("no-digits-here"));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toMatch(/invalid afsl/i);
    expect(mockGetAfslLicensee).not.toHaveBeenCalled();
  });

  it("strips non-digits before lookup (e.g. 'AFSL no. 240 813')", async () => {
    mockGetAfslLicensee.mockResolvedValue(LICENSEE);
    const res = await GET(new Request("http://x"), ctx("AFSL no. 240 813"));
    expect(res.status).toBe(200);
    // Normalisation must collapse the formatted input to bare digits.
    expect(mockGetAfslLicensee).toHaveBeenCalledWith("240813");
  });

  it("returns 404 with a branchable error when the number is not cached", async () => {
    mockGetAfslLicensee.mockResolvedValue(null);
    const res = await GET(new Request("http://x"), ctx("000001"));
    expect(res.status).toBe(404);
    expect((await res.json() as { error: string }).error).toMatch(/not found in register/i);
  });

  it("returns the licensee payload and a CDN cache header on a hit", async () => {
    mockGetAfslLicensee.mockResolvedValue(LICENSEE);
    const res = await GET(new Request("http://x"), ctx("240813"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as typeof LICENSEE;
    expect(body.licensee_name).toBe("Macquarie Equities Limited");
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=43200");
  });
});
