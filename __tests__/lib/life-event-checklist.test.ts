import { describe, it, expect } from "vitest";
import {
  getChecklist,
  getCompletedCount,
  type WizardStep,
} from "@/lib/life-event-checklist";

const KNOWN_EVENTS = [
  "buying_first_home",
  "buying_investment_property",
  "refinancing_mortgage",
  "getting_married",
  "having_baby",
  "getting_divorced",
  "aged_care_planning",
  "redundancy",
  "starting_new_job",
  "moving_to_australia",
  "received_inheritance",
  "setting_up_smsf",
  "crypto_tax",
  "selling_business",
  "starting_business",
  "approaching_retirement",
  "estate_planning",
];

// ── getChecklist ──────────────────────────────────────────────────────────────

describe("getChecklist", () => {
  it("returns an empty array for an unknown life event", () => {
    expect(getChecklist("not_a_real_event")).toEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(getChecklist("")).toEqual([]);
  });

  it.each(KNOWN_EVENTS)("returns a non-empty array for %s", (eventId) => {
    const steps = getChecklist(eventId);
    expect(steps.length).toBeGreaterThan(0);
  });

  it("every step has a non-empty id and title", () => {
    for (const eventId of KNOWN_EVENTS) {
      for (const step of getChecklist(eventId)) {
        expect(step.id).toBeTruthy();
        expect(step.title).toBeTruthy();
      }
    }
  });

  it("step ids are unique within each checklist", () => {
    for (const eventId of KNOWN_EVENTS) {
      const ids = getChecklist(eventId).map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("optional href is always accompanied by hrefLabel", () => {
    for (const eventId of KNOWN_EVENTS) {
      for (const step of getChecklist(eventId)) {
        if (step.href !== undefined) {
          expect(step.hrefLabel).toBeTruthy();
        }
        if (step.hrefLabel !== undefined) {
          expect(step.href).toBeTruthy();
        }
      }
    }
  });

  it("returns the buying_first_home checklist with 6 steps", () => {
    expect(getChecklist("buying_first_home")).toHaveLength(6);
  });

  it("returns a stable reference — calling twice returns equal arrays", () => {
    const a = getChecklist("getting_married");
    const b = getChecklist("getting_married");
    expect(a).toEqual(b);
  });
});

// ── getCompletedCount ─────────────────────────────────────────────────────────

describe("getCompletedCount", () => {
  const EVENT = "buying_first_home";
  const steps: WizardStep[] = getChecklist(EVENT);
  const allIds = steps.map((s) => s.id);

  it("returns 0 when completed is an empty array", () => {
    expect(getCompletedCount(EVENT, { completed: [] })).toBe(0);
  });

  it("returns 0 when completed is undefined", () => {
    expect(getCompletedCount(EVENT, {})).toBe(0);
  });

  it("returns the total step count when all ids are completed", () => {
    expect(getCompletedCount(EVENT, { completed: allIds })).toBe(steps.length);
  });

  it("counts only the first step when one id is completed", () => {
    expect(getCompletedCount(EVENT, { completed: [allIds[0]!] })).toBe(1);
  });

  it("ignores completed ids that do not appear in the checklist", () => {
    expect(getCompletedCount(EVENT, { completed: ["fake_step", "another_fake"] })).toBe(0);
  });

  it("handles a mix of valid and invalid completed ids", () => {
    const partial = [allIds[0]!, "bogus_id", allIds[1]!];
    expect(getCompletedCount(EVENT, { completed: partial })).toBe(2);
  });

  it("returns 0 for an unknown life event regardless of completed ids", () => {
    expect(getCompletedCount("no_such_event", { completed: ["check_eligibility"] })).toBe(0);
  });

  it("ignores duplicate completed ids", () => {
    const doubled = [allIds[0]!, allIds[0]!, allIds[1]!];
    expect(getCompletedCount(EVENT, { completed: doubled })).toBe(2);
  });
});
