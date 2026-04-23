/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  recordFrequencyImpression,
  getImpressionCount,
  isFrequencyCapped,
  filterByFrequencyCap,
  recordWinnerImpressions,
} from "@/lib/marketplace/frequency-cap";

describe("frequency-cap (session-level client-side)", () => {
  beforeEach(() => {
    // jsdom gives us sessionStorage; clear between tests
    sessionStorage.clear();
  });

  describe("recordFrequencyImpression + getImpressionCount", () => {
    it("starts at zero for unseen campaigns", () => {
      expect(getImpressionCount(1, "above-fold-banner")).toBe(0);
    });

    it("increments on each record", () => {
      recordFrequencyImpression(1, "slot-a");
      recordFrequencyImpression(1, "slot-a");
      recordFrequencyImpression(1, "slot-a");
      expect(getImpressionCount(1, "slot-a")).toBe(3);
    });

    it("namespaces per (campaign, placement)", () => {
      recordFrequencyImpression(1, "slot-a");
      recordFrequencyImpression(1, "slot-b");
      recordFrequencyImpression(2, "slot-a");
      expect(getImpressionCount(1, "slot-a")).toBe(1);
      expect(getImpressionCount(1, "slot-b")).toBe(1);
      expect(getImpressionCount(2, "slot-a")).toBe(1);
      expect(getImpressionCount(2, "slot-b")).toBe(0);
    });

    it("recovers gracefully from corrupt storage", () => {
      sessionStorage.setItem("inv_freq_caps", "{not json");
      // getImpressionCount shouldn't throw
      expect(getImpressionCount(1, "slot-a")).toBe(0);
      // Writing after corrupt read should reset to a fresh entry
      recordFrequencyImpression(1, "slot-a");
      expect(getImpressionCount(1, "slot-a")).toBe(1);
    });

    it("auto-resets a session older than 4 hours", () => {
      // Pre-seed with started 5h ago
      const fiveHoursAgo = Date.now() - 5 * 60 * 60 * 1000;
      sessionStorage.setItem(
        "inv_freq_caps",
        JSON.stringify({ counts: { "1:slot-a": 99 }, started: fiveHoursAgo }),
      );

      // Reading should see 0 (reset)
      expect(getImpressionCount(1, "slot-a")).toBe(0);
    });
  });

  describe("isFrequencyCapped", () => {
    it("defaults to a cap of 8 impressions", () => {
      for (let i = 0; i < 7; i += 1) recordFrequencyImpression(1, "slot-a");
      expect(isFrequencyCapped(1, "slot-a")).toBe(false);
      recordFrequencyImpression(1, "slot-a");
      expect(isFrequencyCapped(1, "slot-a")).toBe(true);
    });

    it("honours a custom cap", () => {
      recordFrequencyImpression(1, "slot-a");
      expect(isFrequencyCapped(1, "slot-a", 1)).toBe(true);
      expect(isFrequencyCapped(1, "slot-a", 10)).toBe(false);
    });
  });

  describe("filterByFrequencyCap", () => {
    it("drops winners that have hit the cap", () => {
      // campaign 1 already at cap=3; campaign 2 at 1
      for (let i = 0; i < 3; i += 1) recordFrequencyImpression(1, "slot-a");
      recordFrequencyImpression(2, "slot-a");

      const winners = [
        { campaign_id: 1, name: "a" },
        { campaign_id: 2, name: "b" },
        { campaign_id: 3, name: "c" },
      ];
      const out = filterByFrequencyCap(winners, "slot-a", 3);
      expect(out.map((w) => w.name)).toEqual(["b", "c"]);
    });

    it("preserves original order", () => {
      const winners = [
        { campaign_id: 10, name: "x" },
        { campaign_id: 11, name: "y" },
        { campaign_id: 12, name: "z" },
      ];
      const out = filterByFrequencyCap(winners, "slot-b", 5);
      expect(out).toEqual(winners);
    });

    it("returns an empty array when every winner is capped", () => {
      for (let i = 0; i < 10; i += 1) recordFrequencyImpression(99, "slot-c");
      expect(
        filterByFrequencyCap([{ campaign_id: 99 }], "slot-c", 8),
      ).toEqual([]);
    });
  });

  describe("recordWinnerImpressions", () => {
    it("increments each winner's impression counter", () => {
      recordWinnerImpressions(
        [{ campaign_id: 1 }, { campaign_id: 2 }, { campaign_id: 1 }],
        "slot-a",
      );
      expect(getImpressionCount(1, "slot-a")).toBe(2);
      expect(getImpressionCount(2, "slot-a")).toBe(1);
    });

    it("namespaces by placement slug", () => {
      recordWinnerImpressions([{ campaign_id: 1 }], "slot-x");
      recordWinnerImpressions([{ campaign_id: 1 }], "slot-y");
      expect(getImpressionCount(1, "slot-x")).toBe(1);
      expect(getImpressionCount(1, "slot-y")).toBe(1);
    });
  });
});
