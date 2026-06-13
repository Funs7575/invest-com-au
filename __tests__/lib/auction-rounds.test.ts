import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the flag evaluator so auctionRoundsEnabled() is deterministic.
const { mockIsFlagEnabled } = vi.hoisted(() => ({ mockIsFlagEnabled: vi.fn() }));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...args: unknown[]) => mockIsFlagEnabled(...args),
}));

import {
  AUCTION_ROUNDS_FLAG,
  auctionRoundsEnabled,
  normaliseVisibility,
  isAuctionRevealed,
  shouldHideBidAmounts,
  finalRoundActive,
  bidRound,
  isFinalRoundBid,
  normaliseCounterStatus,
  bidWasCountered,
} from "@/lib/auction-rounds";

describe("lib/auction-rounds", () => {
  beforeEach(() => mockIsFlagEnabled.mockReset());

  describe("auctionRoundsEnabled", () => {
    it("delegates to isFlagEnabled with the auction_rounds key", async () => {
      mockIsFlagEnabled.mockResolvedValue(true);
      const out = await auctionRoundsEnabled("jo@x.com");
      expect(out).toBe(true);
      expect(mockIsFlagEnabled).toHaveBeenCalledWith(AUCTION_ROUNDS_FLAG, { userKey: "jo@x.com" });
    });

    it("passes undefined userKey when none given", async () => {
      mockIsFlagEnabled.mockResolvedValue(false);
      await auctionRoundsEnabled();
      expect(mockIsFlagEnabled).toHaveBeenCalledWith(AUCTION_ROUNDS_FLAG, { userKey: undefined });
    });
  });

  describe("normaliseVisibility", () => {
    it("only 'sealed' is sealed; everything else (incl. absent column) is open", () => {
      expect(normaliseVisibility("sealed")).toBe("sealed");
      expect(normaliseVisibility("open")).toBe("open");
      expect(normaliseVisibility(undefined)).toBe("open");
      expect(normaliseVisibility(null)).toBe("open");
      expect(normaliseVisibility("garbage")).toBe("open");
    });
  });

  describe("isAuctionRevealed", () => {
    it("open is not revealed; any closed/awarded/expired status is revealed", () => {
      expect(isAuctionRevealed("open")).toBe(false);
      expect(isAuctionRevealed("awarded")).toBe(true);
      expect(isAuctionRevealed("closed")).toBe(true);
      expect(isAuctionRevealed("expired")).toBe(true);
      expect(isAuctionRevealed(null)).toBe(false);
      expect(isAuctionRevealed(undefined)).toBe(false);
    });
  });

  describe("shouldHideBidAmounts — the who-sees-what matrix", () => {
    it("open auction: amounts ALWAYS shown (owner or not)", () => {
      const open = { status: "open", bid_visibility: "open" };
      expect(shouldHideBidAmounts(open, true)).toBe(false);
      expect(shouldHideBidAmounts(open, false)).toBe(false);
    });

    it("absent bid_visibility column (dormant) behaves as open — never hides", () => {
      const dormant = { status: "open" };
      expect(shouldHideBidAmounts(dormant, false)).toBe(false);
      expect(shouldHideBidAmounts(dormant, true)).toBe(false);
    });

    it("sealed + open + OWNER: amounts shown (consumer always sees own auction)", () => {
      const sealedOpen = { status: "open", bid_visibility: "sealed" };
      expect(shouldHideBidAmounts(sealedOpen, true)).toBe(false);
    });

    it("sealed + open + NON-owner (adviser/public): amounts HIDDEN", () => {
      const sealedOpen = { status: "open", bid_visibility: "sealed" };
      expect(shouldHideBidAmounts(sealedOpen, false)).toBe(true);
    });

    it("sealed + CLOSED (revealed at close): amounts shown to everyone", () => {
      const sealedClosed = { status: "awarded", bid_visibility: "sealed" };
      expect(shouldHideBidAmounts(sealedClosed, false)).toBe(false);
      expect(shouldHideBidAmounts(sealedClosed, true)).toBe(false);
      const sealedExpired = { status: "expired", bid_visibility: "sealed" };
      expect(shouldHideBidAmounts(sealedExpired, false)).toBe(false);
    });
  });

  describe("finalRoundActive", () => {
    const now = new Date("2026-06-12T12:00:00Z");
    it("false when no final_round_ends_at", () => {
      expect(finalRoundActive({}, now)).toBe(false);
      expect(finalRoundActive({ final_round_ends_at: null }, now)).toBe(false);
    });
    it("true while now < ends_at, false once elapsed", () => {
      expect(finalRoundActive({ final_round_ends_at: "2026-06-12T18:00:00Z" }, now)).toBe(true);
      expect(finalRoundActive({ final_round_ends_at: "2026-06-12T06:00:00Z" }, now)).toBe(false);
    });
  });

  describe("bid round helpers", () => {
    it("bidRound defaults to 1 when absent/invalid", () => {
      expect(bidRound({})).toBe(1);
      expect(bidRound({ round_number: null })).toBe(1);
      expect(bidRound({ round_number: 0 })).toBe(1);
      expect(bidRound({ round_number: 2 })).toBe(2);
    });
    it("isFinalRoundBid true only for round >= 2", () => {
      expect(isFinalRoundBid({ round_number: 1 })).toBe(false);
      expect(isFinalRoundBid({})).toBe(false);
      expect(isFinalRoundBid({ round_number: 2 })).toBe(true);
    });
  });

  describe("counter helpers", () => {
    it("normaliseCounterStatus accepts only the three states, else null", () => {
      expect(normaliseCounterStatus("pending")).toBe("pending");
      expect(normaliseCounterStatus("accepted")).toBe("accepted");
      expect(normaliseCounterStatus("declined")).toBe("declined");
      expect(normaliseCounterStatus(null)).toBeNull();
      expect(normaliseCounterStatus("")).toBeNull();
      expect(normaliseCounterStatus("weird")).toBeNull();
    });
    it("bidWasCountered true only when accepted", () => {
      expect(bidWasCountered({ counter_status: "accepted" })).toBe(true);
      expect(bidWasCountered({ counter_status: "pending" })).toBe(false);
      expect(bidWasCountered({ counter_status: "declined" })).toBe(false);
      expect(bidWasCountered({})).toBe(false);
    });
  });
});
