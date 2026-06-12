/**
 * "Firsts" milestone registry (RETAIL_UX_NORTHSTAR §5 D7).
 *
 * Hard rule (§9 firewall): every milestone celebrates a RESEARCH act the
 * user owns — saving, comparing, calculating, learning, completing their
 * own profile. Never add a milestone keyed to an outbound affiliate click,
 * an enquiry count, or anything the platform is paid per-event for, and
 * never put product praise in the copy.
 *
 * State is client-side (localStorage) by design: milestones are a feeling,
 * not a ledger. `recordMilestone` is idempotent — true only on first unlock.
 */

export type MilestoneKey =
  | "first_save"
  | "first_compare"
  | "first_calculator"
  | "first_article"
  | "first_path_step"
  | "path_complete"
  | "profile_complete"
  | "first_plan_saved"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "decided_broker";

export interface MilestoneSpec {
  title: string;
  body: string;
  icon: "check" | "spark" | "flame" | "trophy";
  /** Big moment: amber ring + confetti on the toast. */
  big?: boolean;
}

export const MILESTONES: Record<MilestoneKey, MilestoneSpec> = {
  first_save: {
    title: "Saved — your shortlist is born",
    body: "Everything you save lives in one place, on every device once you have a free account.",
    icon: "spark",
    big: true,
  },
  first_compare: {
    title: "Your first side-by-side",
    body: "Comparing real numbers is how good calls get made.",
    icon: "check",
  },
  first_calculator: {
    title: "First calculation done",
    body: "Numbers beat vibes. Signed in, your scenarios are kept for you.",
    icon: "spark",
  },
  first_article: {
    title: "First guide finished",
    body: "Ten minutes of reading now saves expensive lessons later.",
    icon: "spark",
  },
  first_path_step: {
    title: "Learning path started",
    body: "Step one of a structured path — your progress saves as you go.",
    icon: "check",
  },
  path_complete: {
    title: "Path complete",
    body: "Every step done. That's real groundwork.",
    icon: "trophy",
    big: true,
  },
  profile_complete: {
    title: "Profile complete",
    body: "Your numbers are now as specific as we can make them.",
    icon: "trophy",
    big: true,
  },
  first_plan_saved: {
    title: "Plan saved",
    body: "Your action plan is safe — come back to it anytime.",
    icon: "check",
  },
  streak_3: {
    title: "3-day curiosity streak",
    body: "Three days in a row of learning something about your money.",
    icon: "flame",
  },
  streak_7: {
    title: "7-day streak",
    body: "A full week of homework. Quietly impressive.",
    icon: "flame",
    big: true,
  },
  streak_30: {
    title: "30-day streak",
    body: "A month of showing up. This is how confidence gets built.",
    icon: "trophy",
    big: true,
  },
  decided_broker: {
    title: "You made a call",
    body: "Whatever you chose, you did the homework first.",
    icon: "trophy",
    big: true,
  },
};

const STORAGE_KEY = "iv_milestones";

function readState(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function hasMilestone(key: MilestoneKey): boolean {
  return key in readState();
}

/** Returns the unlock ISO dates keyed by milestone, for the dashboard "Firsts" card. */
export function getMilestones(): Partial<Record<MilestoneKey, string>> {
  return readState() as Partial<Record<MilestoneKey, string>>;
}

/**
 * Marks a milestone reached. Returns true only the first time so callers
 * can celebrate exactly once. Safe to call on the server (no-ops to false).
 */
export function recordMilestone(key: MilestoneKey): boolean {
  if (typeof window === "undefined") return false;
  const state = readState();
  if (key in state) return false;
  state[key] = new Date().toISOString();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full/blocked — still report unlocked so the moment shows once this session */
  }
  return true;
}
