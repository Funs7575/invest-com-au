// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveQuizProgress,
  loadQuizProgress,
  clearQuizProgress,
  type QuizProgress,
} from "@/lib/find-advisor/progress-storage";

const KEY = "quiz-progress";

function progress(overrides: Partial<QuizProgress> = {}): QuizProgress {
  return {
    step: 3,
    intent: "buy_property",
    context: ["first_home"],
    state: "NSW",
    postcode: "2000",
    suburb: "Sydney",
    budget: "100k_500k",
    timeline: "asap",
    overseas: false,
    country: "",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("progress-storage", () => {
  it("round-trips a valid progress snapshot", () => {
    saveQuizProgress(progress());
    expect(loadQuizProgress()).toEqual(progress());
  });

  it("is PII-free by construction — the stored blob never contains contact fields", () => {
    // Even if a caller passes a wider object, only the whitelisted answer
    // fields are written.
    saveQuizProgress({
      ...progress(),
      email: "user@example.com",
      firstName: "Jane",
      phone: "0412345678",
    } as QuizProgress & { email: string; firstName: string; phone: string });
    const raw = localStorage.getItem(KEY) ?? "";
    expect(raw).not.toContain("user@example.com");
    expect(raw).not.toContain("Jane");
    expect(raw).not.toContain("0412345678");
  });

  it("caps the restored step at 3 — never resumes into a stale match preview", () => {
    saveQuizProgress(progress({ step: 4 }));
    expect(loadQuizProgress()?.step).toBe(3);
  });

  it("expires after 7 days", () => {
    saveQuizProgress(progress());
    const stored = JSON.parse(localStorage.getItem(KEY)!) as { savedAt: number };
    stored.savedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem(KEY, JSON.stringify(stored));
    expect(loadQuizProgress()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("discards the legacy v1 shape (which nested contact PII)", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        quiz: { step: 3, intent: "buy_property", email: "leak@example.com" },
        timestamp: Date.now(),
      }),
    );
    expect(loadQuizProgress()).toBeNull();
    // The PII purge: the legacy blob is removed entirely.
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("discards corrupt JSON and unknown intents", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadQuizProgress()).toBeNull();

    localStorage.setItem(
      KEY,
      JSON.stringify({ ...progress(), v: 2, savedAt: Date.now(), intent: "yolo_trading" }),
    );
    expect(loadQuizProgress()).toBeNull();
  });

  it("clearQuizProgress removes the snapshot", () => {
    saveQuizProgress(progress());
    clearQuizProgress();
    expect(loadQuizProgress()).toBeNull();
  });
});
