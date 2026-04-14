import { describe, it, expect } from "vitest";
import { scoreFraud } from "@/lib/fraud-detection";

describe("scoreFraud — clean baselines", () => {
  it("empty features → clean 0", () => {
    const r = scoreFraud({});
    expect(r.score).toBe(0);
    expect(r.verdict).toBe("clean");
  });

  it("authoritative review → clean", () => {
    const r = scoreFraud({
      contentLength: 200,
      authorVelocity24h: 1,
      authorAgeDays: 365,
      authorPriorVerified: 5,
    });
    expect(r.verdict).toBe("clean");
  });
});

describe("scoreFraud — abuse flags", () => {
  it("disposable email + short content → suspicious", () => {
    const r = scoreFraud({
      disposableEmail: true,
      contentLength: 10,
    });
    expect(r.verdict).toBe("suspicious");
  });

  it("high velocity + duplicate body + short content → fraud", () => {
    const r = scoreFraud({
      authorVelocity24h: 12,
      duplicateBodyHits: 3,
      contentLength: 10,
      ratingIsExtreme: true,
    });
    expect(r.verdict).toBe("fraud");
    expect(r.score).toBeGreaterThanOrEqual(70);
  });

  it("prior flags + fresh account → suspicious", () => {
    const r = scoreFraud({
      priorFlags: 2,
      authorAgeDays: 1,
    });
    expect(r.score).toBeGreaterThanOrEqual(40);
  });
});

describe("scoreFraud — protective factors", () => {
  it("authorPriorVerified subtracts points", () => {
    const strict = scoreFraud({
      authorVelocity24h: 5,
      contentLength: 20,
      authorPriorVerified: 5,
    });
    const loose = scoreFraud({
      authorVelocity24h: 5,
      contentLength: 20,
    });
    expect(strict.score).toBeLessThan(loose.score);
  });
});

describe("scoreFraud — signals surface in output", () => {
  it("returns a reason string that includes the top contributors", () => {
    const r = scoreFraud({
      disposableEmail: true,
      contentLength: 5,
    });
    expect(r.reason).toMatch(/disposableEmail|contentLength/);
    expect(r.signals.length).toBeGreaterThan(0);
  });
});
