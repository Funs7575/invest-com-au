// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  MILESTONES,
  getMilestones,
  hasMilestone,
  recordMilestone,
  type MilestoneKey,
} from "@/lib/milestones";

describe("milestones registry", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("every milestone has title, body and a valid icon", () => {
    for (const spec of Object.values(MILESTONES)) {
      expect(spec.title.length).toBeGreaterThan(0);
      expect(spec.body.length).toBeGreaterThan(0);
      expect(["check", "spark", "flame", "trophy"]).toContain(spec.icon);
    }
  });

  it("celebrates the user's process, never product quality (§9 firewall)", () => {
    const banned = [/best for you/i, /you should/i, /don't miss/i, /act now/i];
    for (const spec of Object.values(MILESTONES)) {
      for (const pattern of banned) {
        expect(spec.title).not.toMatch(pattern);
        expect(spec.body).not.toMatch(pattern);
      }
    }
  });

  it("recordMilestone returns true exactly once per key", () => {
    expect(hasMilestone("first_save")).toBe(false);
    expect(recordMilestone("first_save")).toBe(true);
    expect(recordMilestone("first_save")).toBe(false);
    expect(hasMilestone("first_save")).toBe(true);
  });

  it("stores an ISO timestamp per unlocked milestone", () => {
    recordMilestone("streak_3");
    const state = getMilestones();
    expect(state.streak_3).toBeTruthy();
    expect(new Date(state.streak_3 as string).getTime()).not.toBeNaN();
  });

  it("keys are independent", () => {
    recordMilestone("first_compare");
    expect(hasMilestone("first_compare")).toBe(true);
    expect(hasMilestone("first_calculator")).toBe(false);
  });

  it("survives corrupted storage", () => {
    window.localStorage.setItem("iv_milestones", "{not json");
    expect(hasMilestone("first_save")).toBe(false);
    expect(recordMilestone("first_save")).toBe(true);
  });

  it("registry keys are stable (renames break stored unlocks)", () => {
    const expected: MilestoneKey[] = [
      "first_save",
      "first_compare",
      "first_calculator",
      "first_article",
      "first_path_step",
      "path_complete",
      "profile_complete",
      "first_plan_saved",
      "streak_3",
      "streak_7",
      "streak_30",
      "decided_broker",
    ];
    expect(Object.keys(MILESTONES).sort()).toEqual([...expected].sort());
  });
});
