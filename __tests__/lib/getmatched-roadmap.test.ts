import { describe, it, expect } from "vitest";
import {
  groupChecklist,
  timelineBadgeLabel,
} from "@/lib/getmatched/roadmap";
import type { ChecklistItem } from "@/lib/getmatched/types";

const mk = (n: number): ChecklistItem[] =>
  Array.from({ length: n }, (_, i) => ({ label: `Step ${i + 1}` }));

describe("groupChecklist — phase assignment", () => {
  it("first 2 → Today, next 2 → This week, rest → This month (5 items)", () => {
    const phases = groupChecklist(mk(5));
    expect(phases.map((p) => p.key)).toEqual(["today", "this_week", "this_month"]);
    expect(phases[0]!.items.map((i) => i.label)).toEqual(["Step 1", "Step 2"]);
    expect(phases[1]!.items.map((i) => i.label)).toEqual(["Step 3", "Step 4"]);
    expect(phases[2]!.items.map((i) => i.label)).toEqual(["Step 5"]);
  });

  it("≤3 items: everything in Today / This week, no This month", () => {
    const phases = groupChecklist(mk(3));
    expect(phases.map((p) => p.key)).toEqual(["today", "this_week"]);
    expect(phases[0]!.items.map((i) => i.label)).toEqual(["Step 1", "Step 2"]);
    expect(phases[1]!.items.map((i) => i.label)).toEqual(["Step 3"]);
  });

  it("exactly 2 items: single Today phase", () => {
    const phases = groupChecklist(mk(2));
    expect(phases.map((p) => p.key)).toEqual(["today"]);
    expect(phases[0]!.items.map((i) => i.label)).toEqual(["Step 1", "Step 2"]);
  });

  it("single item: single Today phase", () => {
    const phases = groupChecklist(mk(1));
    expect(phases.map((p) => p.key)).toEqual(["today"]);
    expect(phases[0]!.items).toHaveLength(1);
  });

  it("empty checklist → no phases", () => {
    expect(groupChecklist([])).toEqual([]);
  });

  it("4 items: Today + This week, no This month", () => {
    const phases = groupChecklist(mk(4));
    expect(phases.map((p) => p.key)).toEqual(["today", "this_week"]);
    expect(phases[1]!.items.map((i) => i.label)).toEqual(["Step 3", "Step 4"]);
  });

  it("large checklist: This month absorbs everything past index 3", () => {
    const phases = groupChecklist(mk(7));
    const month = phases.find((p) => p.key === "this_month")!;
    expect(month.items.map((i) => i.index)).toEqual([4, 5, 6]);
  });
});

describe("groupChecklist — original index preservation", () => {
  it("carries the original index for every item (toggle key)", () => {
    const phases = groupChecklist(mk(6));
    const allIndices = phases.flatMap((p) => p.items.map((i) => i.index));
    expect(allIndices).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("preserves href / done / brief_template fields", () => {
    const items: ChecklistItem[] = [
      { label: "A", href: "/a", done: true },
      { label: "B", brief_template: "tax" },
      { label: "C" },
    ];
    const phases = groupChecklist(items);
    const flat = phases.flatMap((p) => p.items);
    expect(flat[0]).toMatchObject({ label: "A", href: "/a", done: true, index: 0 });
    expect(flat[1]).toMatchObject({ label: "B", brief_template: "tax", index: 1 });
    expect(flat[2]).toMatchObject({ label: "C", index: 2 });
  });

  it("index maps back to the source array position regardless of phase", () => {
    const items = mk(5);
    const phases = groupChecklist(items);
    for (const phase of phases) {
      for (const item of phase.items) {
        expect(item.label).toBe(items[item.index]!.label);
      }
    }
  });
});

describe("timelineBadgeLabel", () => {
  it("maps known timelines", () => {
    expect(timelineBadgeLabel("now")).toBe("Now");
    expect(timelineBadgeLabel("3_6_months")).toBe("3–6 months");
    expect(timelineBadgeLabel("researching")).toBe("Just researching");
  });

  it("returns null for unset / unknown", () => {
    expect(timelineBadgeLabel(null)).toBeNull();
    expect(timelineBadgeLabel(undefined)).toBeNull();
    expect(timelineBadgeLabel("")).toBeNull();
    expect(timelineBadgeLabel("someday")).toBeNull();
  });
});
