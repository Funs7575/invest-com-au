/**
 * Named seed prompts for the Investment Concierge.
 *
 * UI surfaces (e.g. /advisors, post-quiz drop-offs)
 * deep-link to `/concierge?finder=<key>` and the client looks up the
 * starter prompt here. Replacing the prior free-form `?seed=<text>`
 * removes the URL-tampering vector entirely — only keys in this
 * allowlist auto-fire a message.
 *
 * Adding a new finder:
 *   1. Pick a short kebab-case key.
 *   2. Add a label (shown in analytics) and prompt (≤200 chars).
 *   3. Make sure the prompt is educational, not personal-advice
 *      ("what should I look for?", not "should I buy X?"). The
 *      classifier in lib/chatbot.ts blocks the latter anyway, but
 *      good seeds avoid the friction.
 */

export type FinderKey =
  | "advisor-finder"
  | "broker-comparison"
  | "smsf-101"
  | "first-etf";

export interface ConciergeSeed {
  /** Short label for analytics + admin tooling. */
  label: string;
  /** Auto-fired starter message. Capped at 200 chars. */
  prompt: string;
}

export const CONCIERGE_SEEDS: Record<FinderKey, ConciergeSeed> = {
  "advisor-finder": {
    label: "Advisor finder",
    prompt:
      "I'm thinking about hiring a financial advisor. What should I look for, and what questions should I ask?",
  },
  "broker-comparison": {
    label: "Broker comparison",
    prompt:
      "I'm choosing between online share brokers in Australia. What are the main differences I should compare?",
  },
  "smsf-101": {
    label: "SMSF basics",
    prompt:
      "What are the main pros, cons, and ongoing costs of running a self-managed super fund in Australia?",
  },
  "first-etf": {
    label: "First ETF",
    prompt:
      "I'm a beginner looking to buy my first ETF. What concepts should I understand before choosing one?",
  },
};

const FINDER_KEYS: ReadonlySet<string> = new Set(Object.keys(CONCIERGE_SEEDS));

/**
 * Returns the seed prompt for a given finder key, or null if the key
 * isn't on the allowlist. Pure — safe for both server and client.
 */
export function lookupSeed(rawKey: string | null | undefined): ConciergeSeed | null {
  if (!rawKey) return null;
  const key = rawKey.trim().toLowerCase();
  if (!FINDER_KEYS.has(key)) return null;
  return CONCIERGE_SEEDS[key as FinderKey];
}

/** Type guard — useful in route handlers + tests. */
export function isFinderKey(value: unknown): value is FinderKey {
  return typeof value === "string" && FINDER_KEYS.has(value.trim().toLowerCase());
}
