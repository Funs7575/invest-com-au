import { describe, it, expect } from "vitest";
import {
  allQuests,
  getQuest,
  progressFor,
  questsForTrigger,
  QUEST_ICON_GLYPH,
  QUEST_TIERS,
  QUEST_TIER_LABEL,
  type Quest,
  type QuestTier,
} from "@/lib/quests";

/**
 * Registry integrity + pure-helper tests for Consumer Quests (idea #19).
 *
 * The CTA-href check asserts against a HARDCODED allow-list of routes that
 * were each verified to resolve to a real page in app/ at build time of this
 * feature. If a future quest points at a route not in this list, this test
 * fails loudly — that is the intended tripwire (it forces re-verification
 * that the new CTA actually resolves rather than 404s or 301-bounces).
 */

// Every href below was verified to map to a real app/<path>/page.tsx in this
// tree (no redirect-only paths — `/quiz` is a permanent redirect to
// `/get-matched`, so the registry uses the canonical live route directly).
const VERIFIED_CTA_HREFS: ReadonlySet<string> = new Set([
  "/account/investor-profile", // app/account/investor-profile/page.tsx
  "/account/watchlist", // app/account/watchlist/page.tsx
  "/learn", // app/learn/page.tsx
  "/get-matched", // app/get-matched/page.tsx (canonical; /quiz → 301 here)
  "/account/goals", // app/account/goals/page.tsx
  "/account/holdings", // app/account/holdings/page.tsx
  "/account/alerts", // app/account/alerts/page.tsx
  "/account/holdings/import", // app/account/holdings/import/page.tsx
  "/briefs/new", // app/briefs/new/page.tsx
]);

describe("quests registry integrity", () => {
  const quests = allQuests();

  it("has at least one quest", () => {
    expect(quests.length).toBeGreaterThan(0);
  });

  it("has unique, non-empty, kebab-case ids", () => {
    const ids = quests.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("has non-empty title, description and ctaLabel for every quest", () => {
    for (const q of quests) {
      expect(q.title.trim().length).toBeGreaterThan(0);
      expect(q.description.trim().length).toBeGreaterThan(0);
      expect(q.ctaLabel.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses only known tiers, each present in QUEST_TIERS", () => {
    for (const q of quests) {
      expect(QUEST_TIERS).toContain(q.tier);
      expect(QUEST_TIER_LABEL[q.tier]).toBeTruthy();
    }
  });

  it("maps every icon to a glyph in QUEST_ICON_GLYPH", () => {
    for (const q of quests) {
      expect(QUEST_ICON_GLYPH[q.icon]).toBeTruthy();
    }
  });

  it("has a positive integer threshold for every quest", () => {
    for (const q of quests) {
      expect(Number.isInteger(q.threshold)).toBe(true);
      expect(q.threshold).toBeGreaterThanOrEqual(1);
    }
  });

  it("points every ctaHref at a verified, app-router-resolvable route", () => {
    for (const q of quests) {
      expect(
        VERIFIED_CTA_HREFS.has(q.ctaHref),
        `quest "${q.id}" ctaHref ${q.ctaHref} is not in the verified route allow-list — verify it resolves to a real page and add it`,
      ).toBe(true);
    }
  });

  it("never points a ctaHref at a known redirect-only path", () => {
    // `/quiz` is a permanent redirect; linking it would bounce the CTA.
    for (const q of quests) {
      expect(q.ctaHref).not.toBe("/quiz");
    }
  });
});

describe("getQuest", () => {
  it("returns the matching quest for a known id", () => {
    const q = getQuest("complete-your-profile");
    expect(q).toBeDefined();
    expect(q?.trigger).toBe("profile_saved");
  });

  it("returns undefined for an unknown id", () => {
    expect(getQuest("not-a-real-quest")).toBeUndefined();
  });
});

describe("questsForTrigger", () => {
  it("returns all quests bound to a trigger (holding_added fans out to two)", () => {
    const hits = questsForTrigger("holding_added");
    const ids = hits.map((q) => q.id).sort();
    expect(ids).toEqual(["first-holding", "three-holdings"]);
  });

  it("returns an empty list for a trigger no quest uses", () => {
    // cast: exercises the runtime filter, not the type union
    expect(questsForTrigger("nonexistent" as never)).toEqual([]);
  });
});

describe("progressFor", () => {
  const quests = allQuests();
  const allIds = quests.map((q) => q.id);

  it("reports zero progress and the first quest as next when nothing earned", () => {
    const p = progressFor([]);
    expect(p.totalEarned).toBe(0);
    expect(p.totalQuests).toBe(quests.length);
    expect(p.earnedIds).toEqual([]);
    expect(p.nextSuggested?.id).toBe(quests[0]!.id);
    const tierTotal = p.perTier.reduce((sum, t) => sum + t.total, 0);
    expect(tierTotal).toBe(quests.length);
    for (const t of p.perTier) expect(t.earned).toBe(0);
  });

  it("counts a single earned quest and advances nextSuggested past it", () => {
    const firstId = quests[0]!.id;
    const p = progressFor([firstId]);
    expect(p.totalEarned).toBe(1);
    expect(p.earnedIds).toEqual([firstId]);
    // next suggested is the first quest that is NOT the earned one
    expect(p.nextSuggested?.id).not.toBe(firstId);
    expect(p.nextSuggested).not.toBeNull();
  });

  it("ignores unknown/retired ids in counts but does not crash", () => {
    const p = progressFor(["complete-your-profile", "retired-ghost-quest"]);
    expect(p.totalEarned).toBe(1);
    expect(p.earnedIds).toEqual(["complete-your-profile"]);
  });

  it("de-dupes: the same earned id twice counts once", () => {
    const p = progressFor(["first-holding", "first-holding"]);
    expect(p.totalEarned).toBe(1);
  });

  it("reports per-tier earned counts correctly", () => {
    // Earn every starter-tier quest; builder/pro stay at zero.
    const starterIds = quests
      .filter((q) => q.tier === "starter")
      .map((q) => q.id);
    const p = progressFor(starterIds);
    const byTier = new Map<QuestTier, { earned: number; total: number }>(
      p.perTier.map((t) => [t.tier, { earned: t.earned, total: t.total }]),
    );
    const starter = byTier.get("starter")!;
    expect(starter.earned).toBe(starter.total);
    expect(byTier.get("builder")!.earned).toBe(0);
    expect(byTier.get("pro")!.earned).toBe(0);
  });

  it("returns nextSuggested = null when every quest is earned", () => {
    const p = progressFor(allIds);
    expect(p.totalEarned).toBe(quests.length);
    expect(p.nextSuggested).toBeNull();
  });
});

describe("registry is presentation-ordered starter → builder → pro", () => {
  it("never places a later tier before an earlier one", () => {
    const order: Record<QuestTier, number> = { starter: 0, builder: 1, pro: 2 };
    const seen = allQuests().map((q: Quest) => order[q.tier]);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]!).toBeGreaterThanOrEqual(seen[i - 1]!);
    }
  });
});
