// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  storeQualificationData,
  getQualificationData,
  clearQualificationData,
} from "@/lib/qualification-store";

describe("qualification-store (sessionStorage wrapper)", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("storeQualificationData + getQualificationData round-trip", () => {
    it("stores the payload and getQualificationData returns it", () => {
      storeQualificationData("find_advisor", { riskProfile: "balanced" });
      const out = getQualificationData();
      expect(out).not.toBeNull();
      expect(out!.source).toBe("find_advisor");
      expect(out!.data).toEqual({ riskProfile: "balanced" });
      expect(out!.captured_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("overwrites the previous payload (single-slot storage)", () => {
      storeQualificationData("quiz", { step: 1 });
      storeQualificationData("mortgage_calculator", { principal: 500_000 });
      const out = getQualificationData();
      expect(out!.source).toBe("mortgage_calculator");
      expect(out!.data).toEqual({ principal: 500_000 });
    });
  });

  describe("getQualificationData null cases", () => {
    it("returns null when nothing is stored", () => {
      expect(getQualificationData()).toBeNull();
    });

    it("returns null on malformed JSON (doesn't throw)", () => {
      sessionStorage.setItem("qualification_data", "{not valid json");
      expect(getQualificationData()).toBeNull();
    });
  });

  describe("clearQualificationData", () => {
    it("removes the stored entry", () => {
      storeQualificationData("quiz", { answer: 42 });
      expect(getQualificationData()).not.toBeNull();
      clearQualificationData();
      expect(getQualificationData()).toBeNull();
    });

    it("is a no-op when nothing is stored (does not throw)", () => {
      expect(() => clearQualificationData()).not.toThrow();
    });
  });

  describe("storeQualificationData resilience", () => {
    it("swallows sessionStorage.setItem errors (private mode / quota)", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceeded");
      });
      // Should not throw, and storage stays empty
      expect(() =>
        storeQualificationData("quiz", { step: 1 }),
      ).not.toThrow();
    });
  });

  describe("SSR safety (window undefined)", () => {
    function withoutWindow<T>(fn: () => T): T {
      const original = globalThis.window;
      // @ts-expect-error — deliberately simulating SSR
      delete globalThis.window;
      try {
        return fn();
      } finally {
        globalThis.window = original;
      }
    }

    it("storeQualificationData is a no-op on SSR", () => {
      withoutWindow(() => {
        storeQualificationData("quiz", { x: 1 });
      });
      // With window restored, check nothing leaked to storage
      expect(sessionStorage.getItem("qualification_data")).toBeNull();
    });

    it("getQualificationData returns null on SSR", () => {
      const result = withoutWindow(() => getQualificationData());
      expect(result).toBeNull();
    });

    it("clearQualificationData is a no-op on SSR", () => {
      sessionStorage.setItem("qualification_data", "stays-put");
      withoutWindow(() => clearQualificationData());
      expect(sessionStorage.getItem("qualification_data")).toBe("stays-put");
    });
  });
});
