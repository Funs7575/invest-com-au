/**
 * The side-effect firewall — request classification + policy resolution.
 *
 * Pure module (no Playwright). Given a request's pathname + method, it decides
 * whether the bot fleet may let the request hit the server for real (`allow`)
 * or must intercept it with a synthetic response (`mock`).
 *
 * Two-axis model:
 *   1. Category — what kind of side effect the endpoint has.
 *   2. Target class — `sandbox` (disposable) vs `protected` (conservative).
 *
 * Some categories are ALWAYS mocked regardless of target because their effects
 * reach external/irreversible systems (real card charges, affiliate-network
 * postbacks, third-party OAuth) or destroy fixtures we rely on.
 *
 * Route inventory derived from the live `app/api/**` + `app/go/**` tree
 * (see __tests__/bots/money-paths.test.ts for the asserted cases).
 */

export type SideEffectCategory =
  | "payment"
  | "affiliate"
  | "lead"
  | "email"
  | "content"
  | "account"
  | "account-destructive"
  | "ai"
  | "external-integration";

export type SafetyAction = "allow" | "mock";

export interface PolicyOptions {
  targetClass: "sandbox" | "protected";
  /** Mock AI endpoints to save tokens even when they'd otherwise be allowed. */
  mockAi: boolean;
  /** Permit destructive account writes on a sandbox target. */
  allowDestructive: boolean;
}

/** Base policy per category. Overrides (mockAi, allowDestructive) applied in resolveAction. */
const POLICY: Record<SideEffectCategory, Record<"sandbox" | "protected", SafetyAction>> = {
  // Irreversible / external — never hit live, on any target.
  payment: { sandbox: "mock", protected: "mock" },
  affiliate: { sandbox: "mock", protected: "mock" },
  "external-integration": { sandbox: "mock", protected: "mock" },
  // Destroys seeded fixtures — mocked unless explicitly allowed on a sandbox.
  "account-destructive": { sandbox: "mock", protected: "mock" },
  // Internal state — exercise for real on a sandbox, mock on anything protected.
  lead: { sandbox: "allow", protected: "mock" },
  email: { sandbox: "allow", protected: "mock" },
  content: { sandbox: "allow", protected: "mock" },
  account: { sandbox: "allow", protected: "mock" },
  // Server-side cost-capped; allowed everywhere, but mockable to save tokens.
  ai: { sandbox: "allow", protected: "allow" },
};

interface Rule {
  category: SideEffectCategory;
  test: RegExp;
  /** Restrict to these HTTP methods. */
  methods?: ReadonlySet<string>;
  /** Also match safe (GET/HEAD) methods — used by tracking pixels/redirects. */
  includeGet?: boolean;
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Ordered — first match wins. More specific / higher-risk rules come first.
const RULES: readonly Rule[] = [
  // ── Affiliate / click tracking (GET redirects + tracking beacons) ──────────
  { category: "affiliate", test: /^\/go\//, includeGet: true },
  {
    category: "affiliate",
    test: /^\/api\/(affiliate\/click|track-click|ab-track|drip-click|attribution\/touch|form-event|track-event)\b/,
    includeGet: true,
  },
  // ── Payments — never hit live. Deliberately broad substring matches:
  //    over-mocking a payment path is the safe failure direction, and these
  //    catch hyphenated variants like `create-checkout` / `billing-portal`
  //    that a `/checkout` or `/billing/` segment match would miss. ──────────
  { category: "payment", test: /^\/api\/stripe\// },
  { category: "payment", test: /billing/i },
  { category: "payment", test: /checkout/i },
  { category: "payment", test: /^\/api\/(sponsored-booking|course\/purchase)\b/ },
  // ── Third-party integrations / OAuth / inbound webhooks ────────────────────
  {
    category: "external-integration",
    test: /^\/api\/(account\/holdings\/sharesight|org-auth\/stripe-connect|webhooks\/)/,
  },
  // ── Destructive account ops ────────────────────────────────────────────────
  { category: "account-destructive", test: /^\/api\/account\/(delete|documents)\b/ },
  // ── Lead generation / quiz capture (money pipeline) ────────────────────────
  {
    category: "lead",
    test: /^\/api\/(advisor-lead|submit-lead|quiz-lead|quiz\/submit|hub-quiz\/capture|developer-leads|report-leads|report-download|org-apply|exit-match|advisor-enquiry|claim-listing)\b/,
  },
  { category: "lead", test: /^\/api\/listings\/owner-flow\/[^/]+\/submit\b/ },
  // ── Email capture / alert subscriptions / outbound mail triggers ───────────
  {
    category: "email",
    test: /^\/api\/(newsletter|email-capture|rate-alerts|fee-alerts|country-rule-alerts|unsubscribe|send-switching-report|review-incentive|broker-review-invite)\b/,
  },
  // ── AI endpoints (server-side cost-capped) ─────────────────────────────────
  {
    category: "ai",
    test: /^\/api\/(chatbot|concierge|search-semantic|answers\/ask)\b/,
  },
  { category: "ai", test: /^\/api\/calculator\/explain\b/ },
  // ── Community / content writes ─────────────────────────────────────────────
  {
    category: "content",
    test: /^\/api\/(community|reviews|advisor-review|user-review|follows|office-hours|events|answers|article-reactions|article-comments|bug-report|complaints|nps|churn-survey|questions|rba-polls)\b/,
  },
  { category: "content", test: /\/endorse\b/ },
  // ── Account writes (non-destructive) ───────────────────────────────────────
  { category: "account", test: /^\/api\/account\// },
  // ── Catch-all: any other API write is treated as content (allow on sandbox,
  //    mock on protected). Unknown high-risk paths are covered by the broad
  //    payment/affiliate rules above. ───────────────────────────────────────
  { category: "content", test: /^\/api\// },
];

function methodMatches(rule: Rule, method: string): boolean {
  if (rule.methods) return rule.methods.has(method);
  if (rule.includeGet) return true;
  return WRITE_METHODS.has(method);
}

/**
 * Classify a request by its side-effect category, or `null` if it carries no
 * side effect we care about (e.g. a plain GET read).
 */
export function classify(pathname: string, method: string): SideEffectCategory | null {
  const m = method.toUpperCase();
  for (const rule of RULES) {
    if (rule.test.test(pathname) && methodMatches(rule, m)) {
      return rule.category;
    }
  }
  return null;
}

/** Resolve the action (allow | mock) for a category under the given options. */
export function resolveAction(category: SideEffectCategory, opts: PolicyOptions): SafetyAction {
  if (category === "ai" && opts.mockAi) return "mock";
  if (
    category === "account-destructive" &&
    opts.allowDestructive &&
    opts.targetClass === "sandbox"
  ) {
    return "allow";
  }
  return POLICY[category][opts.targetClass];
}

export interface Decision {
  category: SideEffectCategory;
  action: SafetyAction;
}

/**
 * One-shot helper: classify + resolve. Returns `null` when the request should
 * proceed untouched (no side effect).
 */
export function decide(pathname: string, method: string, opts: PolicyOptions): Decision | null {
  const category = classify(pathname, method);
  if (category === null) return null;
  return { category, action: resolveAction(category, opts) };
}
