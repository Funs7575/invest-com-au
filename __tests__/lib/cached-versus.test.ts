import { describe, it, expect } from "vitest";
import { normaliseFaqs } from "@/lib/cached-versus";

describe("normaliseFaqs", () => {
  it("returns undefined when raw is null", () => {
    expect(normaliseFaqs(null)).toBeUndefined();
  });

  it("returns undefined for empty arrays", () => {
    expect(normaliseFaqs([])).toBeUndefined();
  });

  it("preserves canonical {question, answer} rows", () => {
    const raw = [
      { question: "What is Stake?", answer: "A broker." },
      { question: "What is CommSec?", answer: "Also a broker." },
    ];
    expect(normaliseFaqs(raw)).toEqual(raw);
  });

  it("expands shorthand {q, a} into canonical shape", () => {
    const raw = [
      { q: "What is Stake?", a: "A broker." },
      { q: "Fees?", a: "Low." },
    ];
    expect(normaliseFaqs(raw)).toEqual([
      { question: "What is Stake?", answer: "A broker." },
      { question: "Fees?", answer: "Low." },
    ]);
  });

  it("accepts mixed shapes in the same array", () => {
    const raw = [
      { question: "Canonical?", answer: "Yes." },
      { q: "Short?", a: "Also yes." },
    ];
    expect(normaliseFaqs(raw)).toEqual([
      { question: "Canonical?", answer: "Yes." },
      { question: "Short?", answer: "Also yes." },
    ]);
  });

  it("drops entries missing a question", () => {
    const raw = [
      { answer: "orphan answer" },
      { question: "Good Q", answer: "Good A" },
    ] as unknown as Parameters<typeof normaliseFaqs>[0];
    expect(normaliseFaqs(raw)).toEqual([
      { question: "Good Q", answer: "Good A" },
    ]);
  });

  it("drops entries missing an answer", () => {
    const raw = [
      { question: "orphan question" },
      { q: "Good Q", a: "Good A" },
    ] as unknown as Parameters<typeof normaliseFaqs>[0];
    expect(normaliseFaqs(raw)).toEqual([
      { question: "Good Q", answer: "Good A" },
    ]);
  });

  it("drops entries with empty strings (falsy)", () => {
    const raw = [
      { question: "", answer: "no question" },
      { question: "no answer", answer: "" },
      { question: "Real", answer: "Valid" },
    ];
    expect(normaliseFaqs(raw)).toEqual([
      { question: "Real", answer: "Valid" },
    ]);
  });

  it("ignores null and non-object entries", () => {
    const raw = [
      null,
      "string-not-object",
      42,
      { question: "Good Q", answer: "Good A" },
    ] as unknown as Parameters<typeof normaliseFaqs>[0];
    expect(normaliseFaqs(raw)).toEqual([
      { question: "Good Q", answer: "Good A" },
    ]);
  });

  it("returns undefined when everything is filtered out", () => {
    const raw = [
      { question: "" },
      { answer: "" },
      null,
    ] as unknown as Parameters<typeof normaliseFaqs>[0];
    expect(normaliseFaqs(raw)).toBeUndefined();
  });
});
