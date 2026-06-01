/**
 * Central configuration for the bot fleet.
 *
 * Pure module — NO Playwright / browser imports — so it can be unit-tested
 * under vitest and reused from any context (CLI, spec, aggregator).
 *
 * The fleet is environment-agnostic: it drives whatever `BOTS_BASE_URL`
 * points at. Safety posture is derived from the *target class*:
 *   - `sandbox`   — disposable target (local dev or a staging deploy seeded
 *                   with throwaway data). Internal writes (forum posts,
 *                   bookmarks, leads) are allowed so deep flows can be
 *                   exercised end-to-end.
 *   - `protected` — anything we must treat conservatively. Only reads and
 *                   AI (which is server-side cost-capped) are allowed; every
 *                   state-mutating write is intercepted and answered with a
 *                   synthetic response so nothing real happens.
 *
 * Irreversible / external side-effects (payments, affiliate redirects,
 * destructive account ops, third-party integrations) are ALWAYS mocked,
 * regardless of target class — see `safety/money-paths.ts`.
 */

export type TargetClass = "sandbox" | "protected";

export interface BotConfig {
  /** Base URL the fleet drives, e.g. http://localhost:3000 */
  baseUrl: string;
  /** Lower-cased host parsed from baseUrl. */
  host: string;
  /** Derived safety posture. */
  targetClass: TargetClass;
  /** Number of concurrent bot sessions (maps to Playwright workers). */
  concurrency: number;
  /** Max actions an AI-driven session may take before it is force-stopped. */
  maxStepsPerSession: number;
  /**
   * Hard cap on total Anthropic tokens (input + output) for the whole run.
   * 0 disables AI-driven bots entirely (deterministic flows still run).
   */
  aiTokenBudget: number;
  /**
   * Hard cap on estimated AI spend (USD) for the whole run. Enforced
   * independently of the token cap — whichever trips first stops AI. This is
   * the "charge no more than $X to the bots line" guardrail. 0 = no $ cap
   * (token cap still applies). Defaults to a conservative $20 so a misconfig
   * can never run away.
   */
  aiCostBudgetUsd: number;
  /** Mock AI endpoints (chatbot, concierge…) to save tokens. */
  mockAi: boolean;
  /** Permit destructive account writes (delete, doc removal) on a sandbox. */
  allowDestructive: boolean;
  /** Loud, explicit override required to point at a prod-looking host. */
  prodOverride: boolean;
  /**
   * Trust an intercepting-proxy / self-signed cert. Sandbox-only escape hatch
   * for TLS-MITM environments (e.g. this workspace); leave off for real runs.
   */
  ignoreHttpsErrors: boolean;
  /** Absolute-ish directory (relative to repo root) for this run's artifacts. */
  runDir: string;
  /** Unique id for this fleet run. */
  runId: string;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

/** The production apex + any subdomain of it. Vercel previews (*.vercel.app) are NOT prod. */
export function isProdHost(host: string): boolean {
  const h = host.toLowerCase().replace(/:\d+$/, "");
  return h === "invest.com.au" || h.endsWith(".invest.com.au");
}

export function resolveTargetClass(
  host: string,
  explicit?: string | null,
): TargetClass {
  if (explicit === "sandbox" || explicit === "protected") return explicit;
  const h = host.toLowerCase().replace(/:\d+$/, "");
  return LOCAL_HOSTS.has(h) ? "sandbox" : "protected";
}

function intEnv(key: string, fallback: number, min: number, max: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function boolEnv(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

function makeRunId(now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}`;
}

/**
 * Build a BotConfig from the environment. Pure aside from reading
 * `process.env` and the clock — both injectable via `overrides` for tests.
 */
export function loadConfig(overrides: Partial<BotConfig> = {}, now: Date = new Date()): BotConfig {
  const baseUrl =
    overrides.baseUrl ??
    process.env.BOTS_BASE_URL ??
    process.env.E2E_BASE_URL ??
    "http://localhost:3000";
  const host = overrides.host ?? hostOf(baseUrl);
  const targetClass =
    overrides.targetClass ?? resolveTargetClass(host, process.env.BOTS_TARGET_CLASS);
  // BOTS_RUN_ID / BOTS_RUN_DIR let the Playwright config pin one run id that
  // both the parallel workers and the (separate-process) globalTeardown share,
  // so every shard lands in the same run directory and is aggregated together.
  const runId = overrides.runId ?? process.env.BOTS_RUN_ID ?? makeRunId(now);

  return {
    baseUrl,
    host,
    targetClass,
    concurrency: overrides.concurrency ?? intEnv("BOTS_CONCURRENCY", 4, 1, 64),
    maxStepsPerSession:
      overrides.maxStepsPerSession ?? intEnv("BOTS_MAX_STEPS", 40, 1, 500),
    aiTokenBudget:
      overrides.aiTokenBudget ?? intEnv("BOTS_AI_TOKEN_BUDGET", 0, 0, 100_000_000),
    aiCostBudgetUsd:
      overrides.aiCostBudgetUsd ?? intEnv("BOTS_AI_COST_BUDGET_USD", 20, 0, 100_000),
    mockAi: overrides.mockAi ?? boolEnv("BOTS_MOCK_AI", true),
    allowDestructive:
      overrides.allowDestructive ?? boolEnv("BOTS_ALLOW_DESTRUCTIVE", false),
    prodOverride: overrides.prodOverride ?? boolEnv("BOTS_PROD_OVERRIDE", false),
    ignoreHttpsErrors:
      overrides.ignoreHttpsErrors ?? boolEnv("BOTS_IGNORE_HTTPS_ERRORS", false),
    runDir: overrides.runDir ?? process.env.BOTS_RUN_DIR ?? `bots/.runs/${runId}`,
    runId,
  };
}

/**
 * Refuse to drive a production host unless explicitly overridden. This is the
 * last line of defence on top of per-request interception — a bot fleet must
 * never be pointed at the live site by accident.
 */
export function assertTargetAllowed(config: BotConfig): void {
  if (isProdHost(config.host) && !config.prodOverride) {
    throw new Error(
      `[bots] Refusing to run against a production host: "${config.host}". ` +
        `The bot fleet is for local/staging targets. If you REALLY mean to ` +
        `point at prod, set BOTS_PROD_OVERRIDE=1 — but note every write is ` +
        `still intercepted, so this is rarely what you want.`,
    );
  }
}
