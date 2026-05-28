import { describe, it, expect } from "vitest";
import {
  detectQueryIntent,
  primaryIntent,
  deduplicateDocuments,
  scoreDocuments,
} from "@/lib/concierge-scoring";
import type { ConciergeRetrievedDoc } from "@/lib/concierge-retrieval";

// ── helpers ───────────────────────────────────────────────────────────────────

function doc(
  id: string,
  type: string,
  score: number,
  title = `${type} — ${id}`,
): ConciergeRetrievedDoc {
  return { document_id: id, document_type: type, title, body_excerpt: "excerpt", score };
}

// ── detectQueryIntent ─────────────────────────────────────────────────────────

describe("detectQueryIntent", () => {
  it("returns general with confidence 0 for an empty query", () => {
    const signals = detectQueryIntent("");
    expect(signals).toHaveLength(1);
    expect(signals[0]?.intent).toBe("general");
    expect(signals[0]?.confidence).toBe(0);
  });

  it("returns general for a query with no recognised keywords", () => {
    const signals = detectQueryIntent("hello world");
    expect(signals[0]?.intent).toBe("general");
  });

  it("detects 'broker' intent from keyword 'broker'", () => {
    const signals = detectQueryIntent("Which online broker should I use for ASX trading?");
    const brokerSignal = signals.find((s) => s.intent === "broker");
    expect(brokerSignal).toBeDefined();
    expect(brokerSignal!.confidence).toBeGreaterThan(0);
  });

  it("detects 'advisor' intent from 'financial adviser'", () => {
    const signals = detectQueryIntent("How do I find a good financial adviser?");
    const adv = signals.find((s) => s.intent === "advisor");
    expect(adv).toBeDefined();
  });

  it("detects 'etf' intent from 'ETF'", () => {
    const signals = detectQueryIntent("I want to invest in an ETF tracking the ASX 200");
    const etfSignal = signals.find((s) => s.intent === "etf");
    expect(etfSignal).toBeDefined();
  });

  it("detects 'smsf' intent from 'SMSF'", () => {
    const signals = detectQueryIntent("Can I buy property inside my SMSF?");
    const smsfSignal = signals.find((s) => s.intent === "smsf");
    expect(smsfSignal).toBeDefined();
  });

  it("detects 'tax' intent from 'franking credit'", () => {
    const signals = detectQueryIntent("How do franking credits work?");
    const taxSignal = signals.find((s) => s.intent === "tax");
    expect(taxSignal).toBeDefined();
  });

  it("detects 'retirement' intent from 'retirement'", () => {
    const signals = detectQueryIntent("How much super do I need for retirement?");
    const retirementSignal = signals.find((s) => s.intent === "retirement");
    expect(retirementSignal).toBeDefined();
  });

  it("returns signals sorted by descending confidence", () => {
    // Query hits both broker (many keywords) and general
    const signals = detectQueryIntent("best ASX broker with CHESS sponsored and low brokerage");
    for (let i = 1; i < signals.length; i++) {
      expect(signals[i - 1]!.confidence).toBeGreaterThanOrEqual(signals[i]!.confidence);
    }
  });

  it("confidence is capped at 1 for many keyword matches", () => {
    // Very keyword-dense: hits broker, asx, chess sponsored, buy shares, brokerage
    const signals = detectQueryIntent("best online broker asx buy shares chess sponsored brokerage trading platform");
    const brokerSignal = signals.find((s) => s.intent === "broker");
    expect(brokerSignal!.confidence).toBeLessThanOrEqual(1);
  });

  it("is case-insensitive", () => {
    const lower = detectQueryIntent("smsf trustee obligations");
    const upper = detectQueryIntent("SMSF TRUSTEE OBLIGATIONS");
    expect(lower[0]?.intent).toBe(upper[0]?.intent);
  });
});

// ── primaryIntent ─────────────────────────────────────────────────────────────

describe("primaryIntent", () => {
  it("returns the highest-confidence intent", () => {
    expect(primaryIntent("I want to compare online brokers")).toBe("broker");
  });

  it("returns 'general' for an unrecognised query", () => {
    expect(primaryIntent("xyz abc 123")).toBe("general");
  });

  it("returns 'smsf' when SMSF keywords dominate", () => {
    expect(primaryIntent("SMSF setup trustee obligations lrba self-managed super")).toBe("smsf");
  });
});

// ── deduplicateDocuments ──────────────────────────────────────────────────────

describe("deduplicateDocuments", () => {
  it("returns all docs when all titles are unique", () => {
    const docs = [doc("a", "advisor", 0.9), doc("b", "broker", 0.8)];
    expect(deduplicateDocuments(docs)).toHaveLength(2);
  });

  it("keeps the higher-score copy on title collision", () => {
    const d1 = { ...doc("a", "advisor", 0.7), title: "Same Title" };
    const d2 = { ...doc("b", "advisor", 0.9), title: "Same Title" };
    const result = deduplicateDocuments([d1, d2]);
    expect(result).toHaveLength(1);
    expect(result[0]!.score).toBe(0.9);
    expect(result[0]!.document_id).toBe("b");
  });

  it("is case-insensitive for title matching", () => {
    const d1 = { ...doc("a", "advisor", 0.7), title: "Vanguard ETF Guide" };
    const d2 = { ...doc("b", "advisor", 0.8), title: "vanguard etf guide" };
    const result = deduplicateDocuments([d1, d2]);
    expect(result).toHaveLength(1);
    expect(result[0]!.score).toBe(0.8);
  });

  it("handles an empty array", () => {
    expect(deduplicateDocuments([])).toEqual([]);
  });

  it("handles a single document", () => {
    const docs = [doc("x", "broker", 0.95)];
    expect(deduplicateDocuments(docs)).toHaveLength(1);
  });
});

// ── scoreDocuments ────────────────────────────────────────────────────────────

describe("scoreDocuments", () => {
  const baseDocs: ConciergeRetrievedDoc[] = [
    doc("adv-1", "advisor", 0.8),
    doc("brk-1", "broker", 0.7),
    doc("art-1", "article", 0.75),
    doc("adv-2", "advisor", 0.65),
    doc("brk-2", "broker", 0.6),
    doc("adv-3", "advisor", 0.55),
  ];

  it("returns at most topN documents", () => {
    const result = scoreDocuments(baseDocs, "find me a financial advisor", 3);
    expect(result).toHaveLength(3);
  });

  it("returns all docs when topN >= doc count", () => {
    const result = scoreDocuments(baseDocs, "any question", 100);
    expect(result.length).toBeLessThanOrEqual(baseDocs.length);
  });

  it("boosts advisor docs for an advisor query", () => {
    const result = scoreDocuments(baseDocs, "I need a licensed financial advisor", 6);
    // All advisor docs should have computedScore > their raw retrieval score
    const advisors = result.filter((d) => d.document_type === "advisor");
    for (const adv of advisors) {
      expect(adv.computedScore).toBeGreaterThan(adv.score);
    }
  });

  it("boosts broker docs for a broker query", () => {
    const result = scoreDocuments(baseDocs, "best online broker ASX trading platform", 6);
    const brokers = result.filter((d) => d.document_type === "broker");
    for (const brk of brokers) {
      expect(brk.computedScore).toBeGreaterThan(brk.score);
    }
  });

  it("returns documents sorted by computedScore descending", () => {
    const result = scoreDocuments(baseDocs, "ETF index fund passive");
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.computedScore).toBeGreaterThanOrEqual(result[i]!.computedScore);
    }
  });

  it("includes computedScore field on every returned document", () => {
    const result = scoreDocuments(baseDocs, "any question");
    for (const d of result) {
      expect(typeof d.computedScore).toBe("number");
      expect(d.computedScore).toBeGreaterThan(0);
    }
  });

  it("deduplicates before scoring", () => {
    const dup1 = { ...doc("adv-1", "advisor", 0.9), title: "Duplicate" };
    const dup2 = { ...doc("adv-2", "advisor", 0.7), title: "Duplicate" };
    const result = scoreDocuments([dup1, dup2], "advisor", 5);
    const withTitle = result.filter((d) => d.title === "Duplicate");
    expect(withTitle).toHaveLength(1);
    expect(withTitle[0]!.score).toBe(0.9);
  });

  it("handles an empty input array", () => {
    const result = scoreDocuments([], "anything", 5);
    expect(result).toEqual([]);
  });

  it("uses default topN of 5 when omitted", () => {
    const many = Array.from({ length: 10 }, (_, i) => doc(`d${i}`, "article", 0.5 + i * 0.04));
    const result = scoreDocuments(many, "general question");
    expect(result).toHaveLength(5);
  });
});
