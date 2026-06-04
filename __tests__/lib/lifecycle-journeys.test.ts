import { describe, it, expect } from "vitest";
import {
  LIFECYCLE_JOURNEYS,
  getJourneyContexts,
  getPrimaryJourneyContext,
} from "@/lib/lifecycle-journeys";

// ── registry integrity ────────────────────────────────────────────────────────

describe("LIFECYCLE_JOURNEYS registry", () => {
  it("contains at least 3 journeys", () => {
    expect(LIFECYCLE_JOURNEYS.length).toBeGreaterThanOrEqual(3);
  });

  it("all journey ids are unique", () => {
    const ids = LIFECYCLE_JOURNEYS.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every journey has a non-empty id, title, description, stages, and entryPoints", () => {
    for (const j of LIFECYCLE_JOURNEYS) {
      expect(j.id.length).toBeGreaterThan(0);
      expect(j.title.length).toBeGreaterThan(0);
      expect(j.description.length).toBeGreaterThan(0);
      expect(j.stages.length).toBeGreaterThan(0);
      expect(j.entryPoints.length).toBeGreaterThan(0);
    }
  });

  it("every stage has a non-empty hubSlug, label, and tagline", () => {
    for (const j of LIFECYCLE_JOURNEYS) {
      for (const s of j.stages) {
        expect(s.hubSlug.length).toBeGreaterThan(0);
        expect(s.label.length).toBeGreaterThan(0);
        expect(s.tagline.length).toBeGreaterThan(0);
      }
    }
  });

  it("all entryPoints are slugs that appear in the journey's stage list", () => {
    for (const j of LIFECYCLE_JOURNEYS) {
      const stageSlugs = new Set(j.stages.map((s) => s.hubSlug));
      for (const ep of j.entryPoints) {
        expect(stageSlugs.has(ep)).toBe(true);
      }
    }
  });

  it("no duplicate hubSlug within a single journey", () => {
    for (const j of LIFECYCLE_JOURNEYS) {
      const slugs = j.stages.map((s) => s.hubSlug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});

// ── getJourneyContexts ────────────────────────────────────────────────────────

describe("getJourneyContexts", () => {
  it("returns an empty array for an unrecognised hub slug", () => {
    expect(getJourneyContexts("not-a-real-hub")).toEqual([]);
  });

  it("returns at least one context for 'retirement'", () => {
    const ctxs = getJourneyContexts("retirement");
    expect(ctxs.length).toBeGreaterThanOrEqual(1);
  });

  it("each context has journey, currentIndex, prevStage, nextStage", () => {
    const ctxs = getJourneyContexts("retirement");
    for (const ctx of ctxs) {
      expect(ctx.journey).toBeDefined();
      expect(typeof ctx.currentIndex).toBe("number");
      expect("prevStage" in ctx).toBe(true);
      expect("nextStage" in ctx).toBe(true);
    }
  });

  it("currentIndex matches the stage's position in the journey", () => {
    const ctxs = getJourneyContexts("retirement");
    for (const ctx of ctxs) {
      const stage = ctx.journey.stages[ctx.currentIndex];
      expect(stage?.hubSlug).toBe("retirement");
    }
  });

  it("prevStage is null when hub is the first stage", () => {
    // Find a journey where some hub is the first stage
    const firstStageHub = LIFECYCLE_JOURNEYS[0]!.stages[0]!.hubSlug;
    const ctxs = getJourneyContexts(firstStageHub);
    // Find the context for the journey where it IS index 0
    const firstCtx = ctxs.find((c) => c.currentIndex === 0);
    expect(firstCtx).toBeDefined();
    expect(firstCtx!.prevStage).toBeNull();
  });

  it("nextStage is null when hub is the last stage", () => {
    const lastJourney = LIFECYCLE_JOURNEYS[0]!;
    const lastStageHub = lastJourney.stages[lastJourney.stages.length - 1]!.hubSlug;
    const ctxs = getJourneyContexts(lastStageHub);
    const lastCtx = ctxs.find(
      (c) => c.currentIndex === c.journey.stages.length - 1,
    );
    expect(lastCtx).toBeDefined();
    expect(lastCtx!.nextStage).toBeNull();
  });

  it("entry-point journeys are sorted first", () => {
    // Find a hub that is an entryPoint in some journey
    const entryJourney = LIFECYCLE_JOURNEYS.find((j) => j.entryPoints.length > 0)!;
    const entryHub = entryJourney.entryPoints[0]!;
    const ctxs = getJourneyContexts(entryHub);
    if (ctxs.length > 1) {
      // The first context should be for a journey that lists this hub as an entryPoint
      expect(ctxs[0]!.journey.entryPoints).toContain(entryHub);
    }
    // Single-result is trivially fine
    expect(ctxs.length).toBeGreaterThanOrEqual(1);
  });
});

// ── getPrimaryJourneyContext ──────────────────────────────────────────────────

describe("getPrimaryJourneyContext", () => {
  it("returns null for an unknown hub slug", () => {
    expect(getPrimaryJourneyContext("not-a-hub")).toBeNull();
  });

  it("returns a JourneyContext for a known entry-point hub", () => {
    const firstEntryHub = LIFECYCLE_JOURNEYS[0]!.entryPoints[0]!;
    const ctx = getPrimaryJourneyContext(firstEntryHub);
    expect(ctx).not.toBeNull();
    expect(ctx!.journey).toBeDefined();
  });

  it("the primary context for an entry-point hub belongs to the right journey", () => {
    const firstJourney = LIFECYCLE_JOURNEYS[0]!;
    const entryHub = firstJourney.entryPoints[0]!;
    const ctx = getPrimaryJourneyContext(entryHub);
    expect(ctx!.journey.id).toBe(firstJourney.id);
  });

  it("prevStage and nextStage are set correctly on the returned context", () => {
    // Pick a hub that is a middle stage in some journey
    const journey = LIFECYCLE_JOURNEYS.find((j) => j.stages.length >= 3)!;
    const middleStage = journey.stages[1]!;
    const ctx = getPrimaryJourneyContext(middleStage.hubSlug);
    if (ctx && ctx.journey.id === journey.id) {
      expect(ctx.prevStage).not.toBeNull();
      expect(ctx.nextStage).not.toBeNull();
    }
    // Even if this hub appears in another journey first, result must be valid
    if (ctx) {
      expect(ctx.journey).toBeDefined();
    }
  });
});
