import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAfslLicensee, mockIsAllowed } = vi.hoisted(() => ({
  mockGetAfslLicensee: vi.fn(),
  mockIsAllowed: vi.fn(),
}));

vi.mock("@/lib/afsl-register", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/afsl-register")>("@/lib/afsl-register");
  return {
    ...actual,
    getAfslLicensee: (...args: unknown[]) => mockGetAfslLicensee(...args),
  };
});

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "1.2.3.4",
}));

import { GET } from "@/app/api/afsl/[number]/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
});

function makeParams(number: string) {
  return { params: Promise.resolve({ number }) };
}

describe("GET /api/afsl/[number]", () => {
  it("returns 400 when the param has no digits", async () => {
    const res = await GET(new Request("http://x"), makeParams("AFSL"));
    expect(res.status).toBe(400);
    expect(mockGetAfslLicensee).not.toHaveBeenCalled();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(new Request("http://x"), makeParams("123456"));
    expect(res.status).toBe(429);
    expect(mockGetAfslLicensee).not.toHaveBeenCalled();
  });

  it("returns 404 when the licensee is not in the cache", async () => {
    mockGetAfslLicensee.mockResolvedValue(null);
    const res = await GET(new Request("http://x"), makeParams("999999"));
    expect(res.status).toBe(404);
    expect(mockGetAfslLicensee).toHaveBeenCalledWith("999999");
  });

  it("returns the licensee with a 24h edge cache header on hit", async () => {
    mockGetAfslLicensee.mockResolvedValue({
      afsl_number: "123456",
      licensee_name: "Acme",
      status: "current",
      licence_conditions: null,
      address: null,
      effective_date: null,
      cancelled_date: null,
      last_verified_at: "2026-05-18T00:00:00Z",
      source: "asic_connect",
    });
    const res = await GET(new Request("http://x"), makeParams("AFSL 123 456"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
    const body = (await res.json()) as { afsl_number: string };
    expect(body.afsl_number).toBe("123456");
  });
});
