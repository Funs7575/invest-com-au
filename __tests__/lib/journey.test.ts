// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  recordMilestone,
  journeySnapshot,
  journeyStageFor,
  JOURNEY_MILESTONE_LABELS,
} from "@/lib/journey";

beforeEach(() => {
  window.localStorage.clear();
});

describe("journey milestones", () => {
  it("first recording is new, repeat is idempotent", () => {
    const first = recordMilestone("first_save");
    expect(first.isNew).toBe(true);
    expect(first.count).toBe(1);
    const again = recordMilestone("first_save");
    expect(again.isNew).toBe(false);
    expect(again.count).toBe(1);
  });

  it("stages advance with distinct milestones and cap at the ladder top", () => {
    expect(journeyStageFor(0).name).toBe("Curious");
    const r1 = recordMilestone("first_save");
    expect(r1.stage.name).toBe("Explorer");
    expect(r1.stageAdvanced).toBe(true);
    const r2 = recordMilestone("first_compare");
    expect(r2.stage.name).toBe("Comparer");
    recordMilestone("quiz_complete");
    recordMilestone("first_article");
    const r5 = recordMilestone("profile_complete");
    expect(r5.stage.name).toBe("Decision-ready");
    expect(r5.stage.nextHint).toBeNull();
    expect(r5.count).toBe(Object.keys(JOURNEY_MILESTONE_LABELS).length);
  });

  it("snapshot reflects stored state and survives corrupt storage", () => {
    recordMilestone("quiz_complete");
    expect(journeySnapshot().milestones).toContain("quiz_complete");
    window.localStorage.setItem("inv_journey", "{not json");
    expect(journeySnapshot().count).toBe(0);
  });
});
