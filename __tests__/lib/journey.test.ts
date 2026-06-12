// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { journeySnapshot } from "@/lib/journey";
import { recordMilestone } from "@/lib/milestones";

describe("journeySnapshot (Feel layer v2 staging)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("fresh visitor is Stage 1: Curious (the BookmarksList pin)", () => {
    const { stage, unlockedCount } = journeySnapshot();
    expect(stage.level).toBe(1);
    expect(stage.name).toBe("Curious");
    expect(unlockedCount).toBe(0);
  });

  it("climbs the research ladder milestone by milestone", () => {
    recordMilestone("first_save");
    expect(journeySnapshot().stage.name).toBe("Saver");

    recordMilestone("first_compare");
    expect(journeySnapshot().stage.name).toBe("Comparer");

    recordMilestone("profile_complete");
    expect(journeySnapshot().stage.name).toBe("Planner");

    recordMilestone("decided_broker");
    const top = journeySnapshot();
    expect(top.stage.level).toBe(5);
    expect(top.stage.name).toBe("Decider");
    expect(top.unlockedCount).toBe(4);
  });

  it("stage names describe the research arc, never investing prowess (§9)", () => {
    for (const key of ["first_save", "first_compare", "first_plan_saved", "decided_broker"] as const) {
      recordMilestone(key);
      const { stage } = journeySnapshot();
      expect(stage.name).not.toMatch(/investor|trader|pro|expert|winner/i);
      if (stage.nextHint) {
        expect(stage.nextHint).not.toMatch(/you should|best|don't miss/i);
      }
    }
  });
});
