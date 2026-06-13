/**
 * Tests for lib/getmatched/intent-parser — the pure free-text intent
 * heuristic (Showcase G8). Exhaustive coverage of the 13 retail goals plus
 * ambiguous / empty / no-hit fallbacks.
 */
import { describe, it, expect } from "vitest";
import { parseFreeTextIntent } from "@/lib/getmatched/intent-parser";

describe("parseFreeTextIntent", () => {
  // ── High-confidence single-goal reads ───────────────────────────────────
  it("crypto / bitcoin", () => {
    const r = parseFreeTextIntent("I want to buy some bitcoin");
    expect(r.intent).toBe("crypto");
    expect(r.confidence).toBe("high");
    expect(r.matched_terms).toContain("bitcoin");
  });

  it("crypto / ethereum boundary token 'eth'", () => {
    const r = parseFreeTextIntent("looking to get into eth and other coins");
    expect(r.intent).toBe("crypto");
  });

  it("crypto / generic", () => {
    expect(parseFreeTextIntent("how do I start with crypto?").intent).toBe("crypto");
  });

  it("home / mortgage", () => {
    const r = parseFreeTextIntent("I need to refinance my mortgage");
    expect(r.intent).toBe("home");
    expect(r.confidence).toBe("high");
  });

  it("home / first home buyer", () => {
    expect(parseFreeTextIntent("saving a deposit for a home to live in").intent).toBe("home");
  });

  it("super / smsf", () => {
    const r = parseFreeTextIntent("I want to set up an smsf");
    expect(r.intent).toBe("super");
    expect(r.confidence).toBe("high");
  });

  it("super / superannuation", () => {
    expect(parseFreeTextIntent("optimise my superannuation").intent).toBe("super");
  });

  it("income / dividends", () => {
    const r = parseFreeTextIntent("I want regular dividend income");
    expect(r.intent).toBe("income");
  });

  it("income / passive income", () => {
    expect(parseFreeTextIntent("build some passive income").intent).toBe("income");
  });

  it("property / investment property", () => {
    const r = parseFreeTextIntent("buy an investment property to rent out");
    expect(r.intent).toBe("property");
  });

  it("property / negative gearing", () => {
    expect(parseFreeTextIntent("interested in negative gearing").intent).toBe("property");
  });

  it("trade / day trading", () => {
    const r = parseFreeTextIntent("I want to do some day trading with leverage");
    expect(r.intent).toBe("trade");
    expect(r.confidence).toBe("high");
  });

  it("trade / options", () => {
    expect(parseFreeTextIntent("interested in options trading").intent).toBe("trade");
  });

  it("automate / robo", () => {
    const r = parseFreeTextIntent("just want a set and forget robo advisor");
    expect(r.intent).toBe("automate");
    expect(r.confidence).toBe("high");
  });

  it("automate / hands off", () => {
    expect(parseFreeTextIntent("something hands off, do it for me").intent).toBe("automate");
  });

  it("alt_assets / whisky", () => {
    const r = parseFreeTextIntent("I'd like to invest in whisky casks");
    expect(r.intent).toBe("alt_assets");
  });

  it("alt_assets / 'art' boundary token (not matched in 'start')", () => {
    // "start" contains "art" but the boundary anchor must not fire.
    const r = parseFreeTextIntent("where do I start investing");
    expect(r.intent).not.toBe("alt_assets");
  });

  it("alt_assets / fine art matches the boundary token", () => {
    expect(parseFreeTextIntent("buying fine art as an investment").intent).toBe("alt_assets");
  });

  it("royalties / music royalties", () => {
    const r = parseFreeTextIntent("invest in music royalties");
    expect(r.intent).toBe("royalties");
  });

  it("pre_ipo / private equity", () => {
    const r = parseFreeTextIntent("get into pre-ipo and private equity deals");
    expect(r.intent).toBe("pre_ipo");
  });

  it("grow / long-term ETFs", () => {
    const r = parseFreeTextIntent("grow my wealth long term with etfs");
    expect(r.intent).toBe("grow");
  });

  it("grow / index funds", () => {
    expect(parseFreeTextIntent("invest in index funds for the future").intent).toBe("grow");
  });

  it("help / talk to a financial planner", () => {
    const r = parseFreeTextIntent("I need to talk to a financial planner");
    expect(r.intent).toBe("help");
  });

  it("help / don't know where to start", () => {
    expect(parseFreeTextIntent("honestly I don't know where to start").intent).toBe("help");
  });

  it("browse / just looking", () => {
    expect(parseFreeTextIntent("just looking around for now").intent).toBe("browse");
  });

  // ── Priority / disambiguation ────────────────────────────────────────────
  it("smsf property → super wins over property (SMSF is more specific)", () => {
    const r = parseFreeTextIntent("I want to buy an investment property inside my smsf");
    expect(r.intent).toBe("super");
  });

  it("multiple crypto terms → high confidence clear leader", () => {
    const r = parseFreeTextIntent("bitcoin, ethereum and other crypto on the blockchain");
    expect(r.intent).toBe("crypto");
    expect(r.confidence).toBe("high");
    expect(r.matched_terms.length).toBeGreaterThan(1);
  });

  // ── Ambiguous / null / low-confidence ────────────────────────────────────
  it("ambiguous single-term tie → low confidence", () => {
    // one crypto term + one trade term, both score 1 → genuine tie → low.
    const r = parseFreeTextIntent("crypto cfd");
    expect(r.confidence).toBe("low");
  });

  it("empty string → null / low", () => {
    const r = parseFreeTextIntent("");
    expect(r.intent).toBeNull();
    expect(r.confidence).toBe("low");
    expect(r.matched_terms).toEqual([]);
  });

  it("whitespace only → null", () => {
    expect(parseFreeTextIntent("   \n  ").intent).toBeNull();
  });

  it("no recognisable terms → null", () => {
    const r = parseFreeTextIntent("the quick brown fox jumps over");
    expect(r.intent).toBeNull();
    expect(r.confidence).toBe("low");
  });

  it("handles curly apostrophes", () => {
    expect(parseFreeTextIntent("I don’t know where to start").intent).toBe("help");
  });

  it("is case-insensitive", () => {
    expect(parseFreeTextIntent("BITCOIN please").intent).toBe("crypto");
  });
});
