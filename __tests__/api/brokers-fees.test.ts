import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsRateLimited, mockEq } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn().mockResolvedValue(false),
  mockEq: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({ eq: mockEq })),
        })),
      })),
    }),
  ),
}));

import { GET } from "@/app/api/brokers/fees/route";

const req = (qs: string) =>
  new NextRequest(`https://invest.com.au/api/brokers/fees${qs}`);

describe("GET /api/brokers/fees (Northstar D10)", () => {
  beforeEach(() => {
    mockIsRateLimited.mockResolvedValue(false);
    mockEq.mockResolvedValue({
      data: [{ slug: "stake", name: "Stake", asx_fee_value: 3, us_fee_value: 0, fee_last_checked: null }],
      error: null,
    });
  });

  it("returns current fees for requested slugs with a shared-cache header", async () => {
    const res = await GET(req("?slugs=stake,commsec"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { brokers: { slug: string }[] };
    expect(json.brokers[0]?.slug).toBe("stake");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
  });

  it("400s on missing, malformed or oversized slug lists", async () => {
    expect((await GET(req(""))).status).toBe(400);
    expect((await GET(req("?slugs=Bad_Slug!"))).status).toBe(400);
    const eleven = Array.from({ length: 11 }, (_, i) => `s${i}`).join(",");
    expect((await GET(req(`?slugs=${eleven}`))).status).toBe(400);
  });

  it("429s when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    expect((await GET(req("?slugs=stake"))).status).toBe(429);
  });

  it("500s cleanly on a lookup error", async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await GET(req("?slugs=stake"))).status).toBe(500);
  });
});
