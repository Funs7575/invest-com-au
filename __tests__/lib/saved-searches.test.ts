/**
 * Unit tests for lib/saved-searches.ts.
 *
 * Focus areas:
 *   - `computeMatchSignature` is order-independent and stable.
 *   - String + number ids are normalised consistently.
 *   - Empty input has a deterministic hash distinct from any non-empty
 *     match set.
 *   - The exported constant tuples (`SAVED_SEARCH_KINDS`,
 *     `EMAIL_FREQUENCIES`) match the values the API + cron rely on.
 *
 * DB-backed helpers (listForUser / create / update / remove) require a
 * Supabase mock surface; this file covers the pure helpers + constants
 * only. Route-level tests would exercise the DB paths.
 */

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  computeMatchSignature,
  EMAIL_FREQUENCIES,
  SAVED_SEARCH_KINDS,
} from "@/lib/saved-searches";

describe("computeMatchSignature", () => {
  it("is order-independent", () => {
    const a = computeMatchSignature([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const b = computeMatchSignature([{ id: 3 }, { id: 1 }, { id: 2 }]);
    const c = computeMatchSignature([{ id: 2 }, { id: 3 }, { id: 1 }]);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("is stable across calls with the same input", () => {
    const input = [{ id: 7 }, { id: 42 }, { id: 99 }];
    const first = computeMatchSignature(input);
    const second = computeMatchSignature([...input]);
    expect(first).toBe(second);
  });

  it("normalises numeric and string ids equivalently", () => {
    // The cron pulls ids as numbers; some callers may pass strings.
    // Both should hash to the same signature when the values match.
    const fromNumbers = computeMatchSignature([{ id: 1 }, { id: 2 }]);
    const fromStrings = computeMatchSignature([{ id: "1" }, { id: "2" }]);
    expect(fromNumbers).toBe(fromStrings);
  });

  it("changes when the match set changes", () => {
    const a = computeMatchSignature([{ id: 1 }, { id: 2 }]);
    const b = computeMatchSignature([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const c = computeMatchSignature([{ id: 1 }, { id: 4 }]);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(b).not.toBe(c);
  });

  it("hashes empty input to a fixed, distinct value", () => {
    const empty = computeMatchSignature([]);
    const nonEmpty = computeMatchSignature([{ id: 1 }]);
    // Recomputing the same empty hash gives the same result …
    expect(empty).toBe(computeMatchSignature([]));
    // … and an empty signature is never equal to a non-empty one.
    expect(empty).not.toBe(nonEmpty);
    // Sanity-check: it's a 64-char hex string (sha256 hex digest).
    expect(empty).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces the expected sha256 for a known input", () => {
    // Locks the algorithm: sorted string ids joined with "," then sha256.
    // If we ever change the hash strategy, this test surfaces it instead
    // of silently invalidating every stored last_match_signature.
    const expected = createHash("sha256").update("1,2,3").digest("hex");
    expect(computeMatchSignature([{ id: 2 }, { id: 1 }, { id: 3 }])).toBe(expected);
  });

  it("sorts lexicographically (string sort), not numeric", () => {
    // Lexicographic sort matters because ids may be strings (e.g. slugs).
    // "10" < "2" lexicographically. The hash should reflect that.
    const lexExpected = createHash("sha256").update("10,2").digest("hex");
    expect(computeMatchSignature([{ id: 2 }, { id: 10 }])).toBe(lexExpected);
  });
});

describe("module constants", () => {
  it("exposes the three supported kinds", () => {
    expect(SAVED_SEARCH_KINDS).toEqual(["advisors", "teams", "invest"]);
  });

  it("exposes the three email frequencies", () => {
    expect(EMAIL_FREQUENCIES).toEqual(["off", "daily", "weekly"]);
  });
});
