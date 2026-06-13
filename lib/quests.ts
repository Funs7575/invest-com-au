/**
 * Consumer Quests & Achievements — code-defined registry (idea #19).
 *
 * Tiered achievements bound to real account ACTIONS that create saved
 * state. The registry is the single source of truth for quest copy,
 * tier, the trigger event each is awarded on, an icon key, and a "do
 * this next" CTA. The DB (`user_achievements`) only stores which quests a
 * user has earned, keyed by `id`; everything human-facing lives here so
 * adding/retiring a quest is a code change with no migration.
 *
 * This module is PURE (no DB, no server-only imports) so it can be shared
 * by the server award path (lib/quests-server.ts) and the client badge
 * shelf alike.
 *
 * Design rule (§ visual tone): quests reward SETUP actions — saving a
 * profile, adding holdings, posting a brief — never investment
 * performance. The copy is considered and factual, never a hype reward
 * for a trade going up.
 */

export type QuestTier = "starter" | "builder" | "pro";

/**
 * Trigger events. Each maps 1:1 to a real API route that performs the
 * underlying account action. The award hook at that route fires
 * `awardIfEligible(userId, questId)` (fire-and-forget) after the host
 * action succeeds. Adding a trigger here without wiring its route is a
 * no-op, not a bug — the quest simply never gets awarded.
 */
export type QuestTrigger =
  | "profile_saved" // PATCH /api/account/investor-profile
  | "holding_added" // POST /api/account/holdings  (+ CSV import confirm)
  | "goal_created" // POST /api/account/goals
  | "rate_alert_created" // POST /api/rate-alerts (authenticated branch)
  | "watchlist_item_added" // POST /api/account/watchlist
  | "bookmark_added" // POST /api/bookmarks/toggle (action=add)
  | "quiz_completed" // POST /api/quiz-lead (authenticated branch)
  | "brief_posted" // POST /api/briefs (email → user resolution)
  | "csv_imported"; // POST /api/account/holdings/import

export interface Quest {
  /** Stable key — persisted in user_achievements.quest_id. Never reuse. */
  id: string;
  title: string;
  /** One factual line on what the action sets up — no advice framing. */
  description: string;
  tier: QuestTier;
  /** The account action that awards this quest. */
  trigger: QuestTrigger;
  /**
   * Number of trigger occurrences required (default 1). `three-holdings`
   * needs 3; the award path passes the current count so the helper can
   * gate. Quests with threshold 1 award on the first occurrence.
   */
  threshold: number;
  /** Icon key — rendered as a neutral glyph in the shelf (no gold stars). */
  icon: QuestIcon;
  /** "Do this next" CTA — a real in-app route. */
  ctaHref: string;
  /** Short CTA label for the locked-state button. */
  ctaLabel: string;
}

/**
 * Icon keys → neutral monochrome-friendly glyphs. Deliberately restrained
 * (tools, not trophies) to keep the serious tone. The shelf maps these to
 * display; keeping a fixed union means a typo'd icon fails type-check.
 */
export type QuestIcon =
  | "profile"
  | "holdings"
  | "portfolio"
  | "goal"
  | "alert"
  | "watchlist"
  | "bookmark"
  | "quiz"
  | "brief"
  | "import";

export const QUEST_ICON_GLYPH: Record<QuestIcon, string> = {
  profile: "🧭",
  holdings: "📓",
  portfolio: "📚",
  goal: "🎯",
  alert: "🛎️",
  watchlist: "👁️",
  bookmark: "🔖",
  quiz: "🧩",
  brief: "📨",
  import: "⬆️",
};

/**
 * The registry. Order is presentation order (starter → builder → pro,
 * roughly the activation journey). IDs are kebab-case and immutable once
 * shipped — they are persisted in the DB.
 *
 * Every `ctaHref` is a verified live route (checked against app/ at build
 * time of this feature). Every `trigger` has a wired award hook.
 */
const QUESTS: readonly Quest[] = [
  {
    id: "complete-your-profile",
    title: "Complete your investor profile",
    description: "Save your experience, goals and interests so the rest of the site can tailor what it shows you.",
    tier: "starter",
    trigger: "profile_saved",
    threshold: 1,
    icon: "profile",
    ctaHref: "/account/investor-profile",
    ctaLabel: "Edit profile",
  },
  {
    id: "first-watchlist-item",
    title: "Start a watchlist",
    description: "Add a stock, ETF or fund to your radar to keep an eye on it over time.",
    tier: "starter",
    trigger: "watchlist_item_added",
    threshold: 1,
    icon: "watchlist",
    ctaHref: "/account/watchlist",
    ctaLabel: "Add to watchlist",
  },
  {
    id: "first-bookmark",
    title: "Save your first guide",
    description: "Bookmark an article or guide so you can come back to it from your reading list.",
    tier: "starter",
    trigger: "bookmark_added",
    threshold: 1,
    icon: "bookmark",
    ctaHref: "/learn",
    ctaLabel: "Browse guides",
  },
  {
    id: "first-quiz-complete",
    title: "Finish the matching quiz",
    description: "Answer a few questions so we can record what you're after and surface relevant picks.",
    tier: "starter",
    trigger: "quiz_completed",
    threshold: 1,
    icon: "quiz",
    // Canonical live route. `/quiz` is a permanent redirect to /get-matched
    // (next.config.ts — "/quiz fully replaced by /get-matched"); link the
    // real page directly so the CTA never bounces through a 301.
    ctaHref: "/get-matched",
    ctaLabel: "Take the quiz",
  },
  {
    id: "first-goal",
    title: "Set a financial goal",
    description: "Add a target — a deposit, retirement, anything — and track progress against it.",
    tier: "builder",
    trigger: "goal_created",
    threshold: 1,
    icon: "goal",
    ctaHref: "/account/goals",
    ctaLabel: "Set a goal",
  },
  {
    id: "first-holding",
    title: "Add your first holding",
    description: "Record a position so your portfolio view, net worth and health score have something to work with.",
    tier: "builder",
    trigger: "holding_added",
    threshold: 1,
    icon: "holdings",
    ctaHref: "/account/holdings",
    ctaLabel: "Add a holding",
  },
  {
    id: "first-rate-alert",
    title: "Set a rate alert",
    description: "Get an email when a savings or term-deposit rate crosses the level you care about.",
    tier: "builder",
    trigger: "rate_alert_created",
    threshold: 1,
    icon: "alert",
    ctaHref: "/account/alerts",
    ctaLabel: "Set an alert",
  },
  {
    id: "three-holdings",
    title: "Track three holdings",
    description: "Build out your portfolio to three positions to unlock a fuller diversification and cost picture.",
    tier: "pro",
    trigger: "holding_added",
    threshold: 3,
    icon: "portfolio",
    ctaHref: "/account/holdings",
    ctaLabel: "Add holdings",
  },
  {
    id: "first-csv-import",
    title: "Import a portfolio",
    description: "Upload a CSV from your broker to bring your existing positions in without typing them out.",
    tier: "pro",
    trigger: "csv_imported",
    threshold: 1,
    icon: "import",
    ctaHref: "/account/holdings/import",
    ctaLabel: "Import CSV",
  },
  {
    id: "first-brief-posted",
    title: "Post your first brief",
    description: "Describe what you need and let vetted advisers respond — your account tracks every reply.",
    tier: "pro",
    trigger: "brief_posted",
    threshold: 1,
    icon: "brief",
    ctaHref: "/briefs/new",
    ctaLabel: "Post a brief",
  },
] as const;

/** Tier presentation order. */
export const QUEST_TIERS: readonly QuestTier[] = ["starter", "builder", "pro"];

export const QUEST_TIER_LABEL: Record<QuestTier, string> = {
  starter: "Getting set up",
  builder: "Building it out",
  pro: "Going deeper",
};

/** All quests in presentation order (frozen copy of the registry). */
export function allQuests(): readonly Quest[] {
  return QUESTS;
}

/** Look up a quest by id, or undefined if the id is unknown/retired. */
export function getQuest(id: string): Quest | undefined {
  return QUESTS.find((q) => q.id === id);
}

/** All quests whose award trigger is the given event. */
export function questsForTrigger(trigger: QuestTrigger): readonly Quest[] {
  return QUESTS.filter((q) => q.trigger === trigger);
}

export interface TierProgress {
  tier: QuestTier;
  earned: number;
  total: number;
}

export interface QuestProgress {
  /** quest ids the user has earned (filtered to known quests). */
  earnedIds: string[];
  totalEarned: number;
  totalQuests: number;
  perTier: TierProgress[];
  /**
   * The next quest to suggest: the first not-yet-earned quest in
   * presentation order, or null when everything is earned.
   */
  nextSuggested: Quest | null;
}

/**
 * Pure progress summariser. Takes the user's earned quest ids (e.g. the
 * `quest_id` column of their user_achievements rows) and returns per-tier
 * counts plus the next suggested quest. Unknown ids (a retired quest still
 * stored in the DB) are ignored for counts but don't crash.
 */
export function progressFor(earnedQuestIds: readonly string[]): QuestProgress {
  const earnedSet = new Set(earnedQuestIds);
  // Only count ids that map to a live quest.
  const knownEarned = QUESTS.filter((q) => earnedSet.has(q.id));
  const knownEarnedIds = knownEarned.map((q) => q.id);

  const perTier: TierProgress[] = QUEST_TIERS.map((tier) => {
    const inTier = QUESTS.filter((q) => q.tier === tier);
    const earned = inTier.filter((q) => earnedSet.has(q.id)).length;
    return { tier, earned, total: inTier.length };
  });

  const nextSuggested = QUESTS.find((q) => !earnedSet.has(q.id)) ?? null;

  return {
    earnedIds: knownEarnedIds,
    totalEarned: knownEarnedIds.length,
    totalQuests: QUESTS.length,
    perTier,
    nextSuggested,
  };
}
