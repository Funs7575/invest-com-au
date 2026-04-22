// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getVariant } from "@/lib/ab-test";

describe("getVariant (A/B test assignment)", () => {
  beforeEach(() => {
    // Clear any cookies set by prior tests
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim();
      if (name) document.cookie = `${name}=; path=/; max-age=0`;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'a' on SSR (window undefined) regardless of inputs", () => {
    // The function short-circuits before touching document/Math.random
    // when typeof window === 'undefined'. We can't actually remove
    // window in jsdom, so instead we patch the typeof check by
    // stubbing window temporarily. Since the function reads
    // `typeof window` directly, the simplest SSR simulation is to
    // delete the global and restore it after.
    const original = globalThis.window;
    // @ts-expect-error — deleting the jsdom window for this test only
    delete globalThis.window;
    try {
      expect(getVariant(99)).toBe("a");
    } finally {
      globalThis.window = original;
    }
  });

  it("honours an existing cookie — variant 'a'", () => {
    document.cookie = "_inv_ab_1=a; path=/";
    // Math.random is irrelevant when cookie already set
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(getVariant(1, 1)).toBe("a");
  });

  it("honours an existing cookie — variant 'b'", () => {
    document.cookie = "_inv_ab_2=b; path=/";
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(getVariant(2, 100)).toBe("b");
  });

  it("assigns 'a' when random falls below the traffic split", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1); // 10%
    expect(getVariant(3, 50)).toBe("a"); // 10 < 50 → a
  });

  it("assigns 'b' when random falls at-or-above the traffic split", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9); // 90%
    expect(getVariant(4, 50)).toBe("b"); // 90 >= 50 → b
  });

  it("defaults to a 50/50 split when trafficSplit is omitted", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.49);
    expect(getVariant(5)).toBe("a"); // 49 < default 50 → a

    // Need a fresh test id to bypass the sticky cookie from the first call
    vi.spyOn(Math, "random").mockReturnValue(0.51);
    expect(getVariant(6)).toBe("b"); // 51 >= 50 → b
  });

  it("persists assignment to a cookie so subsequent calls are sticky", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const first = getVariant(7, 50);
    expect(first).toBe("a");

    // Second call with the opposite random value — should still be
    // 'a' because the cookie is read first.
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const second = getVariant(7, 50);
    expect(second).toBe("a");

    // Verify the cookie is present and targeted
    expect(document.cookie).toContain("_inv_ab_7=a");
  });

  it("100% split always produces 'a' (no random output can exceed 100)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    expect(getVariant(8, 100)).toBe("a");
  });

  it("0% split always produces 'b'", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    // 0 < 0 is false → b
    expect(getVariant(9, 0)).toBe("b");
  });
});
