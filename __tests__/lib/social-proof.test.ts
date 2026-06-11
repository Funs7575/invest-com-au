import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFrom, mockResult } = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom: vi.fn() as any,
  mockResult: { count: 0 as number | null, error: null as { message: string } | null },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// unstable_cache needs a Next request context — identity-wrap so the
// core compute path is what we exercise.
vi.mock("@/lib/cache", () => ({
  cached: <T>(fn: T) => fn,
  CacheTTL: { STATIC: 86400, MODERATE: 3600, DYNAMIC: 300 },
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import {
  computeSocialProofStat,
  socialProofLabel,
  isSocialProofMetric,
  SOCIAL_PROOF_MIN_COUNT,
  SOCIAL_PROOF_WINDOW_DAYS,
} from "@/lib/social-proof";

// ── Helpers ───────────────────────────────────────────────────────────────────

type ChainCall = { method: string; args: unknown[] };
let chainCalls: ChainCall[];

function installChain() {
  chainCalls = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  for (const m of ["select", "in", "gte"]) {
    chain[m] = vi.fn((...args: unknown[]) => {
      chainCalls.push({ method: m, args });
      return chain;
    });
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ count: mockResult.count, error: mockResult.error }).then(resolve);
  mockFrom.mockImplementation((table: string) => {
    chainCalls.push({ method: "from", args: [table] });
    return chain;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockResult.count = 0;
  mockResult.error = null;
  installChain();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("isSocialProofMetric", () => {
  it("accepts the three real metrics", () => {
    expect(isSocialProofMetric("quiz")).toBe(true);
    expect(isSocialProofMetric("compare")).toBe(true);
    expect(isSocialProofMetric("calculator")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isSocialProofMetric("")).toBe(false);
    expect(isSocialProofMetric("visitors")).toBe(false);
    expect(isSocialProofMetric("__proto__")).toBe(false);
  });
});

describe("socialProofLabel", () => {
  it("is factual, time-scoped, and formats thousands", () => {
    const label = socialProofLabel("compare", 1240);
    expect(label).toBe(
      `1,240 platforms compared on invest.com.au in the past ${SOCIAL_PROOF_WINDOW_DAYS} days`,
    );
  });

  it("names what was actually counted per metric", () => {
    expect(socialProofLabel("quiz", 100)).toMatch(/quizzes completed/);
    expect(socialProofLabel("compare", 100)).toMatch(/platforms compared/);
    expect(socialProofLabel("calculator", 100)).toMatch(/calculator runs/);
  });

  it("never uses live-ness or urgency phrasing", () => {
    for (const metric of ["quiz", "compare", "calculator"] as const) {
      const label = socialProofLabel(metric, 5000);
      expect(label).not.toMatch(/today|right now|currently|live|viewing/i);
      expect(label).toMatch(new RegExp(`past ${SOCIAL_PROOF_WINDOW_DAYS} days`));
    }
  });
});

describe("computeSocialProofStat", () => {
  it("queries analytics_events for the metric's real event types within the window", async () => {
    mockResult.count = 500;
    await computeSocialProofStat("quiz");

    expect(chainCalls.find((c) => c.method === "from")?.args[0]).toBe("analytics_events");

    // quiz_complete + quiz_completed are double-fired per completion in
    // app/quiz/page.tsx — the quiz metric must count only one of them.
    const inCall = chainCalls.find((c) => c.method === "in");
    expect(inCall?.args[0]).toBe("event_type");
    expect(inCall?.args[1]).toEqual(["quiz_complete"]);

    const gteCall = chainCalls.find((c) => c.method === "gte");
    expect(gteCall?.args[0]).toBe("created_at");
    const sinceIso = gteCall?.args[1] as string;
    const expectedSince = Date.now() - SOCIAL_PROOF_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    expect(Math.abs(new Date(sinceIso).getTime() - expectedSince)).toBeLessThan(10_000);
  });

  it("maps compare and calculator metrics to their own events", async () => {
    mockResult.count = 500;
    await computeSocialProofStat("compare");
    expect(chainCalls.find((c) => c.method === "in")?.args[1]).toEqual(["compare_select"]);

    installChain();
    await computeSocialProofStat("calculator");
    expect(chainCalls.find((c) => c.method === "in")?.args[1]).toEqual(["calculator_use"]);
  });

  it("shows the stat at or above the visibility floor", async () => {
    mockResult.count = SOCIAL_PROOF_MIN_COUNT;
    const stat = await computeSocialProofStat("compare");
    expect(stat).toEqual({
      show: true,
      count: SOCIAL_PROOF_MIN_COUNT,
      label: socialProofLabel("compare", SOCIAL_PROOF_MIN_COUNT),
    });
  });

  it("hides below the floor and never reports the small count", async () => {
    mockResult.count = SOCIAL_PROOF_MIN_COUNT - 1;
    const stat = await computeSocialProofStat("compare");
    expect(stat).toEqual({ show: false });
    expect("count" in stat).toBe(false);
  });

  it("hides at zero", async () => {
    mockResult.count = 0;
    expect(await computeSocialProofStat("quiz")).toEqual({ show: false });
  });

  it("treats a null count as zero (hidden), not as data", async () => {
    mockResult.count = null;
    expect(await computeSocialProofStat("calculator")).toEqual({ show: false });
  });

  it("fails closed on query error", async () => {
    mockResult.count = 9999;
    mockResult.error = { message: "permission denied" };
    expect(await computeSocialProofStat("compare")).toEqual({ show: false });
  });

  it("fails closed when the client throws", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("connection refused");
    });
    expect(await computeSocialProofStat("compare")).toEqual({ show: false });
  });

  it("uses a defensible floor (no tiny-number social proof)", () => {
    expect(SOCIAL_PROOF_MIN_COUNT).toBeGreaterThanOrEqual(25);
  });
});
