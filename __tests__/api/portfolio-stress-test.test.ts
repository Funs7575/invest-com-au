import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "127.0.0.1",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST } from "@/app/api/portfolio-stress-test/route";
import { STRESS_SCENARIOS } from "@/lib/stress-scenarios";

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/portfolio-stress-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  au_equities: 40,
  intl_equities: 30,
  au_property: 10,
  bonds: 15,
  cash: 5,
};

describe("POST /api/portfolio-stress-test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 for missing fields", async () => {
    const res = await POST(makePost({ au_equities: 40 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when allocations exceed 100%", async () => {
    const res = await POST(makePost({
      au_equities: 40,
      intl_equities: 40,
      au_property: 10,
      bonds: 15,
      cash: 5, // total = 110
    }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when any allocation is negative", async () => {
    const res = await POST(makePost({ ...VALID_BODY, au_equities: -10 }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with all scenarios", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { scenarios: unknown[]; results: unknown[] };
    expect(json.scenarios).toHaveLength(STRESS_SCENARIOS.length);
    expect(json.results).toHaveLength(STRESS_SCENARIOS.length);
  });

  it("returns negative drawdown for equity-heavy portfolio in GFC", async () => {
    const res = await POST(makePost({
      au_equities: 50,
      intl_equities: 50,
      au_property: 0,
      bonds: 0,
      cash: 0,
    }));
    const json = (await res.json()) as {
      results: Array<{ scenarioId: string; portfolioDrawdownPct: number }>;
    };
    const gfc = json.results.find((r) => r.scenarioId === "gfc_2008")!;
    expect(gfc.portfolioDrawdownPct).toBeLessThan(-40);
  });

  it("returns a disclaimer", async () => {
    const res = await POST(makePost(VALID_BODY));
    const json = (await res.json()) as { disclaimer: string };
    expect(json.disclaimer).toContain("not personal financial advice");
  });

  it("accepts all-zero allocation", async () => {
    const res = await POST(makePost({
      au_equities: 0,
      intl_equities: 0,
      au_property: 0,
      bonds: 0,
      cash: 0,
    }));
    expect(res.status).toBe(200);
  });

  it("coerces string numbers to numbers", async () => {
    const res = await POST(makePost({
      au_equities: "40",
      intl_equities: "30",
      au_property: "10",
      bonds: "15",
      cash: "5",
    }));
    expect(res.status).toBe(200);
  });
});
