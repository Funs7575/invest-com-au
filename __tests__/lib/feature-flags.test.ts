import { describe, it, expect } from "vitest";
import { evaluateFlag, rolloutHash } from "@/lib/feature-flags";

function row(overrides: Partial<Parameters<typeof evaluateFlag>[0] & object> = {}) {
  return {
    flag_key: "test",
    enabled: true,
    rollout_pct: 100,
    allowlist: [] as string[],
    denylist: [] as string[],
    segments: [] as string[],
    ...overrides,
  };
}

describe("rolloutHash", () => {
  it("is stable for the same input", () => {
    expect(rolloutHash("flag", "user@example.com")).toBe(
      rolloutHash("flag", "user@example.com"),
    );
  });

  it("is in [0, 99]", () => {
    const h = rolloutHash("flag", "user@example.com");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(100);
  });

  it("differs per flag for the same user", () => {
    const a = rolloutHash("flag-a", "user@example.com");
    const b = rolloutHash("flag-b", "user@example.com");
    // They MIGHT collide by chance, but with two different
    // flag keys it's improbable. If this flakes, tighten.
    expect(a).not.toBe(b);
  });
});

describe("evaluateFlag — simple on/off", () => {
  it("returns false for null row", () => {
    expect(evaluateFlag(null, {})).toBe(false);
  });

  it("returns false when enabled is false", () => {
    expect(evaluateFlag(row({ enabled: false }), {})).toBe(false);
  });

  it("returns true when enabled + 100% rollout", () => {
    expect(evaluateFlag(row(), {})).toBe(true);
  });
});

describe("evaluateFlag — deny/allow lists", () => {
  it("denylist wins over allowlist", () => {
    expect(
      evaluateFlag(
        row({ denylist: ["u@x.com"], allowlist: ["u@x.com"] }),
        { userKey: "u@x.com" },
      ),
    ).toBe(false);
  });

  it("allowlist overrides disabled flag", () => {
    expect(
      evaluateFlag(
        row({ enabled: false, allowlist: ["u@x.com"] }),
        { userKey: "u@x.com" },
      ),
    ).toBe(true);
  });

  it("allowlist overrides 0% rollout", () => {
    expect(
      evaluateFlag(
        row({ rollout_pct: 0, allowlist: ["u@x.com"] }),
        { userKey: "u@x.com" },
      ),
    ).toBe(true);
  });
});

describe("evaluateFlag — segment targeting", () => {
  it("empty segments means everyone", () => {
    expect(evaluateFlag(row(), { segment: "advisor" })).toBe(true);
    expect(evaluateFlag(row(), { segment: "user" })).toBe(true);
  });

  it("denies when caller segment is not in list", () => {
    expect(
      evaluateFlag(row({ segments: ["admin"] }), { segment: "advisor" }),
    ).toBe(false);
  });

  it("allows when caller segment matches", () => {
    expect(
      evaluateFlag(row({ segments: ["admin", "advisor"] }), { segment: "advisor" }),
    ).toBe(true);
  });

  it("denies when segments is set and no caller segment given", () => {
    expect(evaluateFlag(row({ segments: ["admin"] }), {})).toBe(false);
  });
});

describe("evaluateFlag — percentage rollout", () => {
  it("0% rollout → false", () => {
    expect(
      evaluateFlag(row({ rollout_pct: 0 }), { userKey: "u@x.com" }),
    ).toBe(false);
  });

  it("100% rollout → true", () => {
    expect(
      evaluateFlag(row({ rollout_pct: 100 }), { userKey: "u@x.com" }),
    ).toBe(true);
  });

  it("partial rollout is deterministic per user key", () => {
    const r = row({ flag_key: "partial", rollout_pct: 50 });
    const first = evaluateFlag(r, { userKey: "u@x.com" });
    const second = evaluateFlag(r, { userKey: "u@x.com" });
    expect(first).toBe(second);
  });

  it("partial rollout gives roughly the right proportion", () => {
    // 100 deterministic keys, 30% rollout. Expect ~30 to be true.
    let trueCount = 0;
    for (let i = 0; i < 100; i++) {
      if (
        evaluateFlag(row({ flag_key: "spread", rollout_pct: 30 }), {
          userKey: `user-${i}@x.com`,
        })
      )
        trueCount++;
    }
    expect(trueCount).toBeGreaterThan(10);
    expect(trueCount).toBeLessThan(60);
  });
});
