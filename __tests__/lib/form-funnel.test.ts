import { describe, it, expect } from "vitest";
import { computeFunnel, biggestDropStep, type FormEventRow } from "@/lib/form-funnel";

function row(
  session_id: string,
  step: string,
  stepIndex: number,
  event = "view",
): FormEventRow {
  return {
    session_id,
    form_name: "quiz",
    step,
    step_index: stepIndex,
    event,
    created_at: new Date().toISOString(),
  };
}

describe("computeFunnel", () => {
  it("returns an empty funnel when no rows match", () => {
    const f = computeFunnel([], "quiz");
    expect(f.form).toBe("quiz");
    expect(f.totalSessions).toBe(0);
    expect(f.steps).toEqual([]);
  });

  it("counts distinct sessions per step", () => {
    const rows = [
      row("s1", "start", 0),
      row("s1", "q1", 1),
      row("s1", "q2", 2),
      row("s2", "start", 0),
      row("s2", "q1", 1),
      row("s3", "start", 0),
    ];
    const f = computeFunnel(rows, "quiz");
    expect(f.totalSessions).toBe(3);
    const byStep = Object.fromEntries(f.steps.map((s) => [s.step, s.sessionsReached]));
    expect(byStep.start).toBe(3);
    expect(byStep.q1).toBe(2);
    expect(byStep.q2).toBe(1);
  });

  it("de-dupes multiple views of the same step by the same session", () => {
    const rows = [row("s1", "start", 0), row("s1", "start", 0), row("s1", "start", 0)];
    const f = computeFunnel(rows, "quiz");
    expect(f.steps[0].sessionsReached).toBe(1);
  });

  it("ignores events other than 'view'", () => {
    const rows = [
      row("s1", "start", 0, "view"),
      row("s1", "q1", 1, "interact"),
      row("s1", "q1", 1, "abandon"),
    ];
    const f = computeFunnel(rows, "quiz");
    // q1 had no 'view', so it shouldn't appear
    expect(f.steps.length).toBe(1);
    expect(f.steps[0].step).toBe("start");
  });

  it("computes conversionFromStart correctly", () => {
    const rows = [
      row("s1", "start", 0),
      row("s2", "start", 0),
      row("s3", "start", 0),
      row("s4", "start", 0),
      row("s1", "q1", 1),
      row("s2", "q1", 1),
    ];
    const f = computeFunnel(rows, "quiz");
    const q1 = f.steps.find((s) => s.step === "q1")!;
    expect(q1.conversionFromStart).toBe(0.5);
  });

  it("computes dropFromPrevious correctly", () => {
    const rows = [
      row("s1", "start", 0),
      row("s2", "start", 0),
      row("s3", "start", 0),
      row("s4", "start", 0),
      row("s1", "q1", 1),
      row("s2", "q1", 1),
      row("s1", "submit", 2),
    ];
    const f = computeFunnel(rows, "quiz");
    const q1 = f.steps.find((s) => s.step === "q1")!;
    // 2 of 4 sessions dropped between start and q1 → 50%
    expect(q1.dropFromPrevious).toBeCloseTo(0.5);
    const submit = f.steps.find((s) => s.step === "submit")!;
    // 1 of 2 sessions dropped between q1 and submit → 50%
    expect(submit.dropFromPrevious).toBeCloseTo(0.5);
  });

  it("filters by form_name", () => {
    const rows: FormEventRow[] = [
      { session_id: "s1", form_name: "quiz", step: "start", step_index: 0, event: "view", created_at: "" },
      { session_id: "s1", form_name: "lead_form", step: "start", step_index: 0, event: "view", created_at: "" },
    ];
    const quiz = computeFunnel(rows, "quiz");
    const lead = computeFunnel(rows, "lead_form");
    expect(quiz.totalSessions).toBe(1);
    expect(lead.totalSessions).toBe(1);
  });

  it("orders steps by step_index ascending", () => {
    const rows = [
      row("s1", "submit", 5),
      row("s1", "start", 0),
      row("s1", "q1", 1),
    ];
    const f = computeFunnel(rows, "quiz");
    expect(f.steps.map((s) => s.step)).toEqual(["start", "q1", "submit"]);
  });
});

describe("biggestDropStep", () => {
  it("returns null for an empty funnel", () => {
    expect(biggestDropStep(computeFunnel([], "quiz"))).toBeNull();
  });

  it("returns the step with the highest dropFromPrevious", () => {
    const rows = [
      row("s1", "start", 0),
      row("s2", "start", 0),
      row("s3", "start", 0),
      row("s4", "start", 0),
      row("s1", "q1", 1),
      row("s2", "q1", 1),
      row("s1", "submit", 2),
    ];
    const f = computeFunnel(rows, "quiz");
    const worst = biggestDropStep(f)!;
    // q1 drops 50% and submit drops 50% — tied. The function picks
    // the first one it encounters, which by iteration order is q1.
    expect(worst.step).toMatch(/q1|submit/);
  });
});
