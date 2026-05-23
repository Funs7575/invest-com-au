import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSearchAfslRegister, mockIsAllowed } = vi.hoisted(() => ({
  mockSearchAfslRegister: vi.fn(),
  mockIsAllowed: vi.fn(),
}));

vi.mock("@/lib/afsl-search", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/afsl-search")>("@/lib/afsl-search");
  return {
    ...actual,
    searchAfslRegister: (...args: unknown[]) => mockSearchAfslRegister(...args),
  };
});

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "1.2.3.4",
}));

import { GET } from "@/app/api/afsl-search/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
});

function req(q: string | null) {
  const url = q === null ? "http://x/api/afsl-search" : `http://x/api/afsl-search?q=${encodeURIComponent(q)}`;
  return new Request(url);
}

describe("GET /api/afsl-search", () => {
  it("returns 429 when rate-limited (and does not query)", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(req("acme"));
    expect(res.status).toBe(429);
    expect(mockSearchAfslRegister).not.toHaveBeenCalled();
  });

  it("returns empty results for a too-short query (no 400)", async () => {
    const res = await GET(req("a"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[]; query: string };
    expect(body.results).toEqual([]);
    expect(body.query).toBe("");
    expect(mockSearchAfslRegister).not.toHaveBeenCalled();
  });

  it("returns empty results when q is missing", async () => {
    const res = await GET(req(null));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[] };
    expect(body.results).toEqual([]);
    expect(mockSearchAfslRegister).not.toHaveBeenCalled();
  });

  it("returns matches with an edge cache header on a valid query", async () => {
    mockSearchAfslRegister.mockResolvedValue([
      {
        afsl_number: "240145",
        licensee_name: "Acme Wealth",
        status: "current",
        conditions_summary: null,
        last_verified_at: "2026-05-18T00:00:00Z",
        advisor_slug: "acme-wealth",
        advisor_name: "Acme Wealth",
      },
    ]);
    const res = await GET(req("acme"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    const body = (await res.json()) as {
      results: { afsl_number: string }[];
      query: string;
    };
    expect(mockSearchAfslRegister).toHaveBeenCalledWith("acme");
    expect(body.query).toBe("acme");
    expect(body.results[0]?.afsl_number).toBe("240145");
  });

  it("returns 500 with empty results when the search throws", async () => {
    mockSearchAfslRegister.mockRejectedValue(new Error("boom"));
    const res = await GET(req("acme"));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { results: unknown[] };
    expect(body.results).toEqual([]);
  });
});
