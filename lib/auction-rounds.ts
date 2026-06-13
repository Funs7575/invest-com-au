/**
 * lib/auction-rounds.ts
 *
 * Idea #11 — Sealed Bids, Best-and-Final rounds & Counter-Offers for the public
 * quote marketplace. This module is the single source of truth for:
 *   - the `auction_rounds` feature flag (fail-closed),
 *   - WHO SEES WHAT in sealed mode (the visibility matrix), and
 *   - small pure helpers shared by the consumer page, the advisor portal, the
 *     bid/accept/counter/final-round routes, and the auction-close cron.
 *
 * DORMANCY CONTRACT: with the flag off, callers must behave exactly as today —
 * no sealed option in the posting UI, no final-round/counter controls, reveal
 * logic dormant. Every read of a NEW column (bid_visibility, round_number,
 * revealed_at, counter_*, final_round_*) is fail-soft: if the column is absent
 * (migration not yet applied) the value is treated as its dormant default
 * (open / round 1 / no counter / no final round) rather than throwing.
 *
 * The new columns are NOT in lib/database.types.ts by design (local row types
 * only — see the worktree brief), so this module defines narrow local shapes.
 */

import { isFlagEnabled } from "@/lib/feature-flags";

/** Feature flag gating ALL new auction mechanics. Fail-closed. */
export const AUCTION_ROUNDS_FLAG = "auction_rounds";

/** Bid visibility modes on advisor_auctions.bid_visibility. */
export type BidVisibility = "open" | "sealed";

/** Counter-offer lifecycle on advisor_auction_bids.counter_status. */
export type CounterStatus = "pending" | "accepted" | "declined";

/** The number of chosen bids a consumer can invite into a best-and-final round. */
export const MAX_FINAL_ROUND_BIDS = 3;

/** Duration of a best-and-final round. */
export const FINAL_ROUND_HOURS = 24;
export const FINAL_ROUND_MS = FINAL_ROUND_HOURS * 60 * 60 * 1000;

/**
 * Is the `auction_rounds` flag on? Centralised so every surface evaluates the
 * same flag the same way. Keyed by the supplied user key (consumer email or
 * advisor email) so a percentage rollout is sticky per actor.
 */
export async function auctionRoundsEnabled(userKey?: string | null): Promise<boolean> {
  return isFlagEnabled(AUCTION_ROUNDS_FLAG, { userKey: userKey || undefined });
}

/**
 * Normalise a raw bid_visibility value (which may be undefined when the column
 * is absent, or any string from the DB) to a known mode. Defaults to "open" —
 * the dormant, byte-identical-to-today behaviour.
 */
export function normaliseVisibility(raw: unknown): BidVisibility {
  return raw === "sealed" ? "sealed" : "open";
}

/** Narrow shape of the auction fields this module reasons about. */
export interface AuctionVisibilityFields {
  status?: string | null;
  bid_visibility?: string | null;
  /** ISO timestamp string or null. */
  final_round_ends_at?: string | null;
  final_round_started_at?: string | null;
}

/**
 * An auction is "revealed" (amounts public to everyone) when it is no longer
 * accepting bids — i.e. its status is not "open". Open sealed auctions hide
 * amounts from non-owners; once closed/awarded/expired they are revealed.
 */
export function isAuctionRevealed(status: string | null | undefined): boolean {
  return status != null && status !== "open";
}

/**
 * THE WHO-SEES-WHAT DECISION for bid amounts on a public quote.
 *
 * Returns true when bid amounts (and therefore the fee-percentile chips and the
 * Decision Kit amount column) must be HIDDEN from the current viewer.
 *
 * Matrix (flag ON):
 *   ┌────────────┬─────────────┬───────────────┬──────────────────────────┐
 *   │ visibility │ auction     │ viewer        │ sees bid amounts?        │
 *   ├────────────┼─────────────┼───────────────┼──────────────────────────┤
 *   │ open       │ any         │ anyone        │ YES (unchanged)          │
 *   │ sealed     │ open        │ owner/consumer│ YES (always sees own)    │
 *   │ sealed     │ open        │ adviser/public│ NO — count only          │
 *   │ sealed     │ closed/etc  │ anyone        │ YES (revealed at close)  │
 *   └────────────┴─────────────┴───────────────┴──────────────────────────┘
 *
 * With the flag OFF this is never called with sealed (posting can't set it), so
 * behaviour is byte-identical: amounts always shown.
 *
 * @param viewerIsOwner the verified consumer (email matched contact_email)
 */
export function shouldHideBidAmounts(
  auction: AuctionVisibilityFields,
  viewerIsOwner: boolean,
): boolean {
  if (normaliseVisibility(auction.bid_visibility) !== "sealed") return false;
  if (viewerIsOwner) return false;
  // Sealed + non-owner: hidden only while still open (pre-reveal).
  return !isAuctionRevealed(auction.status);
}

/**
 * Is a best-and-final round currently live on this auction? True only while the
 * flag mechanics are in play (caller already flag-gates) and now < ends_at.
 */
export function finalRoundActive(
  auction: AuctionVisibilityFields,
  now: Date = new Date(),
): boolean {
  if (!auction.final_round_ends_at) return false;
  const ends = new Date(auction.final_round_ends_at).getTime();
  return Number.isFinite(ends) && now.getTime() < ends;
}

/** Narrow shape of a bid row for round/counter reasoning. */
export interface BidRoundFields {
  round_number?: number | null;
  counter_status?: string | null;
  counter_amount?: number | null;
}

/** Round number of a bid, defaulting to 1 when the column is absent. */
export function bidRound(bid: BidRoundFields): number {
  return typeof bid.round_number === "number" && bid.round_number >= 1
    ? bid.round_number
    : 1;
}

/** Is this bid a round-2 (best-and-final) submission? */
export function isFinalRoundBid(bid: BidRoundFields): boolean {
  return bidRound(bid) >= 2;
}

/** Normalise a raw counter_status to a known value or null. */
export function normaliseCounterStatus(raw: unknown): CounterStatus | null {
  return raw === "pending" || raw === "accepted" || raw === "declined" ? raw : null;
}

/**
 * Does this bid carry an accepted counter-offer? Those render as "countered ✓"
 * (the bid_amount was updated to the agreed figure on accept).
 */
export function bidWasCountered(bid: BidRoundFields): boolean {
  return normaliseCounterStatus(bid.counter_status) === "accepted";
}
