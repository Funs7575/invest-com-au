/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  getPartialPlan,
  setPartialPlan,
  clearPartialPlan,
  describePartial,
  type PartialPlan,
} from "@/lib/getmatched/recall";

const STORAGE_KEY = "iv_gm_partial_plan";

describe("getmatched/recall", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("setPartialPlan + getPartialPlan round-trip", () => {
    it("persists and reads back a partial plan with a stamped updatedAt", () => {
      setPartialPlan({
        answers: { intent: "property", property_sub: "physical" },
        stepIndex: 3,
        totalSteps: 7,
      });
      const read = getPartialPlan();
      expect(read).not.toBeNull();
      expect(read?.stepIndex).toBe(3);
      expect(read?.totalSteps).toBe(7);
      expect(read?.answers.intent).toBe("property");
      expect(typeof read?.updatedAt).toBe("number");
    });
  });

  describe("getPartialPlan edge cases", () => {
    it("returns null when nothing is stored", () => {
      expect(getPartialPlan()).toBeNull();
    });

    it("returns null and clears corrupted JSON", () => {
      sessionStorage.setItem(STORAGE_KEY, "{not valid json");
      expect(getPartialPlan()).toBeNull();
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears entries missing required numeric fields", () => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: {} }));
      expect(getPartialPlan()).toBeNull();
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null and clears stale (>7 day) entries", () => {
      const stale: PartialPlan = {
        answers: { intent: "crypto" },
        stepIndex: 2,
        totalSteps: 7,
        updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stale));
      expect(getPartialPlan()).toBeNull();
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("returns null (but does NOT treat as stale) when the plan is already complete", () => {
      const done: PartialPlan = {
        answers: { intent: "grow" },
        stepIndex: 7,
        totalSteps: 7,
        updatedAt: Date.now(),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(done));
      expect(getPartialPlan()).toBeNull();
      // Completed plans are not "stale" so they are left in place, not wiped.
      expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
    });
  });

  describe("clearPartialPlan", () => {
    it("removes a stored plan", () => {
      setPartialPlan({ answers: {}, stepIndex: 1, totalSteps: 7 });
      clearPartialPlan();
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("describePartial", () => {
    it("renders a human progress label", () => {
      const p: PartialPlan = { answers: {}, stepIndex: 4, totalSteps: 7, updatedAt: Date.now() };
      expect(describePartial(p)).toBe("4 of 7 questions answered");
    });
  });
});
