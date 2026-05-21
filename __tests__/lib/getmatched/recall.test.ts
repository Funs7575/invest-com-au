/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getPartialPlan,
  setPartialPlan,
  clearPartialPlan,
  describePartial,
  type PartialPlan,
} from "@/lib/getmatched/recall";

const STORAGE_KEY = "iv_gm_partial_plan";

function validPlan(over: Partial<PartialPlan> = {}): PartialPlan {
  return {
    answers: { intent: "property" },
    stepIndex: 3,
    totalSteps: 7,
    updatedAt: Date.now(),
    ...over,
  };
}

describe("getmatched/recall", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  describe("setPartialPlan + getPartialPlan round-trip", () => {
    it("persists and reads back a partial plan with a fresh updatedAt", () => {
      const before = Date.now();
      setPartialPlan({ answers: { intent: "property" }, stepIndex: 2, totalSteps: 7 });
      const got = getPartialPlan();
      expect(got).not.toBeNull();
      expect(got!.stepIndex).toBe(2);
      expect(got!.totalSteps).toBe(7);
      expect(got!.answers).toEqual({ intent: "property" });
      expect(got!.updatedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe("getPartialPlan", () => {
    it("returns null when nothing is stored", () => {
      expect(getPartialPlan()).toBeNull();
    });

    it("returns null and clears storage for corrupt JSON", () => {
      window.sessionStorage.setItem(STORAGE_KEY, "{not json");
      expect(getPartialPlan()).toBeNull();
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears when shape is invalid (missing numeric fields)", () => {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers: {}, stepIndex: "x", totalSteps: 7, updatedAt: Date.now() }),
      );
      expect(getPartialPlan()).toBeNull();
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears when the entry is stale (older than TTL)", () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validPlan({ updatedAt: eightDaysAgo })));
      expect(getPartialPlan()).toBeNull();
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns a plan that is just within the TTL window", () => {
      const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validPlan({ updatedAt: sixDaysAgo })));
      expect(getPartialPlan()).not.toBeNull();
    });

    it("returns null (but does NOT clear) when the plan was actually completed", () => {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(validPlan({ stepIndex: 7, totalSteps: 7 })),
      );
      expect(getPartialPlan()).toBeNull();
      // completed plans are not cleared — only returned as null
      expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
    });

    it("returns null when stepIndex exceeds totalSteps", () => {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(validPlan({ stepIndex: 9, totalSteps: 7 })),
      );
      expect(getPartialPlan()).toBeNull();
    });
  });

  describe("clearPartialPlan", () => {
    it("removes a stored plan", () => {
      setPartialPlan({ answers: {}, stepIndex: 1, totalSteps: 5 });
      clearPartialPlan();
      expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("is a no-op when nothing is stored", () => {
      expect(() => clearPartialPlan()).not.toThrow();
    });
  });

  describe("describePartial", () => {
    it("renders a human progress label", () => {
      expect(describePartial(validPlan({ stepIndex: 4, totalSteps: 7 }))).toBe(
        "4 of 7 questions answered",
      );
    });
  });
});
