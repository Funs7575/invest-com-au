/**
 * Concierge document scoring and query-intent detection.
 *
 * Sits between the vector-retrieval step (which returns raw similarity
 * scores) and the prompt-building step (which takes the final context
 * block). Its job:
 *
 *  1. detectQueryIntent — bucket the free-text query into one or more
 *     domain signals so downstream code can weight document types.
 *
 *  2. scoreDocuments — re-rank retrieved docs by combining the
 *     retrieval similarity score with an intent-to-doctype weight.
 *     Returns a slice of topN documents in descending score order.
 *
 *  3. deduplicateDocuments — drops exact-title duplicates, keeping
 *     the highest-scoring copy (a retrieval API can return the same
 *     document at slightly different offsets).
 *
 * Pure functions — no I/O, no state. Designed to be called inside
 * the /api/concierge route handler.
 *
 * AFSL scope: this module only orders documents; it does not produce
 * investment recommendations. The CONCIERGE_BASE_SYSTEM_PROMPT in
 * concierge-retrieval.ts carries the general-advice disclaimer for
 * the model.
 */

import type { ConciergeRetrievedDoc } from "./concierge-retrieval";

// ─── Intent taxonomy ──────────────────────────────────────────────────────────

export type QueryIntent =
  | "advisor"
  | "broker"
  | "etf"
  | "smsf"
  | "property"
  | "super"
  | "retirement"
  | "tax"
  | "general";

/** A detected intent plus a confidence weight (0–1). */
export interface IntentSignal {
  intent: QueryIntent;
  /** Confidence 0-1; 1 = strongly signalled by multiple keywords. */
  confidence: number;
}

// Keyword lists — lower-case, checked with word-boundary-ish test.
const INTENT_KEYWORDS: Record<Exclude<QueryIntent, "general">, string[]> = {
  advisor: [
    "advisor", "adviser", "financial planner", "financial adviser",
    "financial advisor", "licensed", "afsl", "fee for advice",
    "wealth manager", "wealth management", "find an advisor",
  ],
  broker: [
    "broker", "brokerage", "trading platform", "share trading",
    "buy shares", "asx", "chess sponsored", "cfd", "options trading",
    "online broker",
  ],
  etf: [
    "etf", "exchange traded fund", "index fund", "passive invest",
    "vas", "vgs", "ndq", "ivv", "a200", "sto", "bet ashares",
    "betashares", "vanguard etf", "ishares",
  ],
  smsf: [
    "smsf", "self-managed super", "self managed super",
    "self managed superannuation", "smsf trustee", "smsf property",
    "smsf borrowing", "lrba", "smsf audit", "smsf setup",
  ],
  property: [
    "property", "real estate", "investment property", "rental property",
    "negative gearing", "positively geared", "capital growth",
    "land tax", "stamp duty", "rental yield", "buy to let",
  ],
  super: [
    "superannuation", "concessional contribution", "non-concessional",
    "salary sacrifice", "employer contribution", "super fund",
    "mysuper", "industry fund", "retail super", "contribution cap",
  ],
  retirement: [
    "retirement", "retire", "pension", "drawdown", "preservation age",
    "account based pension", "transition to retirement", "ttr",
    "4% rule", "when can i retire",
  ],
  tax: [
    "tax", "franking credit", "cgt", "capital gains tax", "dividend",
    "franked dividend", "unfranked", "tax offset", "tax return",
    "income tax", "marginal rate", "medicare levy",
  ],
};

/**
 * Detect one or more query intents from a free-text query string.
 *
 * Returns signals sorted by descending confidence. Always includes at
 * least one signal — "general" (confidence 0) if nothing else matches.
 */
export function detectQueryIntent(query: string): IntentSignal[] {
  const q = query.toLowerCase();
  const signals: IntentSignal[] = [];

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [
    Exclude<QueryIntent, "general">,
    string[],
  ][]) {
    const matched = keywords.filter((kw) => q.includes(kw)).length;
    if (matched > 0) {
      // Confidence scales with number of matched keywords, capped at 1.
      const confidence = Math.min(1, matched / 3);
      signals.push({ intent, confidence });
    }
  }

  if (signals.length === 0) {
    signals.push({ intent: "general", confidence: 0 });
  }

  return signals.sort((a, b) => b.confidence - a.confidence);
}

/** Returns the primary (highest-confidence) intent. */
export function primaryIntent(query: string): QueryIntent {
  return detectQueryIntent(query)[0]!.intent;
}

// ─── Document-type × intent weight table ─────────────────────────────────────

/**
 * How much to multiply a document's retrieval score when the query
 * intent strongly matches the document type.
 *
 * Values > 1 boost, values < 1 suppress. Documents that are a poor
 * fit for the detected intent get a mild 0.8× penalty so they can
 * still appear when retrieval has nothing better.
 */
const INTENT_DOCTYPE_WEIGHT: Record<
  QueryIntent,
  Partial<Record<string, number>>
> = {
  advisor:    { advisor: 1.4, broker: 0.9, article: 1.0 },
  broker:     { broker: 1.4, advisor: 0.9, article: 1.0 },
  etf:        { broker: 1.2, article: 1.2, advisor: 0.9 },
  smsf:       { advisor: 1.2, article: 1.2, broker: 1.0 },
  property:   { advisor: 1.2, article: 1.2, broker: 0.8 },
  super:      { advisor: 1.1, article: 1.1, broker: 0.9 },
  retirement: { advisor: 1.2, article: 1.1, broker: 0.8 },
  tax:        { advisor: 1.1, article: 1.2, broker: 0.9 },
  general:    {},
};

function doctypeWeight(intent: QueryIntent, docType: string): number {
  return INTENT_DOCTYPE_WEIGHT[intent]?.[docType] ?? 1.0;
}

// ─── Scored document ──────────────────────────────────────────────────────────

export interface ScoredDoc extends ConciergeRetrievedDoc {
  /** Combined score: retrieval score × intent–doctype weight. */
  computedScore: number;
}

// ─── deduplicateDocuments ────────────────────────────────────────────────────

/**
 * Drop documents with duplicate titles, keeping the copy with the
 * highest `score`. Preserves insertion order of the winning copies.
 */
export function deduplicateDocuments(
  docs: ConciergeRetrievedDoc[],
): ConciergeRetrievedDoc[] {
  const seen = new Map<string, ConciergeRetrievedDoc>();
  for (const doc of docs) {
    const key = doc.title.trim().toLowerCase();
    const existing = seen.get(key);
    if (!existing || doc.score > existing.score) {
      seen.set(key, doc);
    }
  }
  return Array.from(seen.values());
}

// ─── scoreDocuments ──────────────────────────────────────────────────────────

/**
 * Re-rank a set of retrieved documents by combining the raw retrieval
 * score with an intent-to-doctype weight.
 *
 * Steps:
 *  1. Deduplicate (keeps highest-score copy of each title).
 *  2. Detect primary intent from the query.
 *  3. Compute `computedScore = doc.score × weight(intent, docType)`.
 *  4. Sort descending by computedScore.
 *  5. Return top `topN` scored documents.
 *
 * @param docs       Raw retrieved documents (order doesn't matter).
 * @param query      The user's raw query text (used for intent detection).
 * @param topN       Maximum number of documents to return (default 5).
 */
export function scoreDocuments(
  docs: ConciergeRetrievedDoc[],
  query: string,
  topN = 5,
): ScoredDoc[] {
  const intent = primaryIntent(query);
  const unique = deduplicateDocuments(docs);

  const scored: ScoredDoc[] = unique.map((doc) => ({
    ...doc,
    computedScore: doc.score * doctypeWeight(intent, doc.document_type),
  }));

  scored.sort((a, b) => b.computedScore - a.computedScore);
  return scored.slice(0, topN);
}
