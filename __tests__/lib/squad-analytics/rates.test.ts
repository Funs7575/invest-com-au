import { describe, it, expect } from "vitest";
import {
  EMPTY_FUNNEL,
  ratesFromFunnel,
} from "@/lib/squad-analytics";

describe("ratesFromFunnel", () => {
  it("returns 0% for the empty funnel (no divide-by-zero)", () => {
    expect(ratesFromFunnel(EMPTY_FUNNEL)).toEqual({
      accept_rate: 0,
      book_rate: 0,
      complete_rate: 0,
    });
  });

  it("computes accept_rate as percentage with 1 decimal", () => {
    const r = ratesFromFunnel({
      briefs_visible: 100,
      briefs_accepted: 25,
      consultations_booked: 10,
      outcomes_completed: 5,
    });
    expect(r.accept_rate).toBe(25);
    expect(r.book_rate).toBe(40);
    expect(r.complete_rate).toBe(50);
  });

  it("returns 0 when denominator is zero (no /0)", () => {
    const r = ratesFromFunnel({
      briefs_visible: 0,
      briefs_accepted: 0,
      consultations_booked: 0,
      outcomes_completed: 5,
    });
    expect(r.accept_rate).toBe(0);
    expect(r.book_rate).toBe(0);
    expect(r.complete_rate).toBe(0);
  });

  it("rounds to 1 decimal", () => {
    const r = ratesFromFunnel({
      briefs_visible: 7,
      briefs_accepted: 3,
      consultations_booked: 0,
      outcomes_completed: 0,
    });
    // 3/7 = 42.857... → 42.9
    expect(r.accept_rate).toBeCloseTo(42.9, 1);
  });
});
