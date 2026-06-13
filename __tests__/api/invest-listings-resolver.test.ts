import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const maybeSingleMock = vi.fn();
const eqMock = vi.fn();
const inMock = vi.fn();

// Self-returning query chain: from().select().eq().in().maybeSingle()
const chain: Record<string, unknown> = {};
chain.select = vi.fn(() => chain);
chain.eq = eqMock.mockImplementation(() => chain);
chain.in = inMock.mockImplementation(() => chain);
chain.maybeSingle = maybeSingleMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => chain),
  })),
}));

import { GET } from "@/app/invest/listings/[slug]/route";

function request(slug: string): [NextRequest, { params: Promise<{ slug: string }> }] {
  return [
    new NextRequest(`http://localhost/invest/listings/${slug}`),
    { params: Promise.resolve({ slug }) },
  ];
}

describe("/invest/listings/[slug] resolver", () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
    eqMock.mockClear();
  });

  it("307s to the canonical vertical lot URL", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        slug: "riverina-aggregation-412ha",
        vertical: "farmland",
        sub_category: null,
        listing_kind: null,
      },
    });
    const res = await GET(...request("riverina-aggregation-412ha"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/invest/farmland/listings/riverina-aggregation-412ha",
    );
  });

  it("routes listed securities by listing_kind, not sector vertical", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        slug: "boss-energy-asx",
        vertical: "uranium",
        sub_category: null,
        listing_kind: "listed_security",
      },
    });
    const res = await GET(...request("boss-energy-asx"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/invest/listed-securities/listings/boss-energy-asx",
    );
  });

  it("resolves active + sold lots only (other statuses fall back to /invest)", async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null });
    const res = await GET(...request("withdrawn-and-gone"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/invest");
    // The lookup is status-guarded: active lots have live pages, sold lots
    // render the read-only archive state; anything else dead-ends, so the
    // resolver falls back to the marketplace instead.
    expect(inMock).toHaveBeenCalledWith("status", ["active", "sold"]);
  });

  it("falls back to /invest when the lookup throws", async () => {
    maybeSingleMock.mockRejectedValueOnce(new Error("db down"));
    const res = await GET(...request("anything"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/invest");
  });
});
