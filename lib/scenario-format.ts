/**
 * Scenario Workspace — presentation helpers for rendering an opaque
 * calculator inputs/snapshot blob as a readable label/value list.
 *
 * Scenarios store the owning calculator's raw input object, whose keys are
 * calculator-specific (camelCase or snake_case) and whose values are scalars.
 * The library + shared pages must render these generically (no per-calculator
 * code), so these helpers humanise keys and format values heuristically.
 *
 * Pure functions — no React, no I/O. Used by the account compare view and the
 * public shared page.
 */

/** A flattened, display-ready field. */
export interface ScenarioField {
  key: string;
  label: string;
  display: string;
}

/** "currentSuperBalance" / "current_super_balance" → "Current super balance". */
export function humaniseFieldKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Heuristic value formatter. Keys hinting at money (amount/balance/salary/
 * income/price/contrib/value/cost/deposit/super) render as AUD; keys hinting
 * at a rate/percentage/pct render with a trailing %. Everything else renders
 * verbatim. Booleans → Yes/No. Conservative on purpose — never invents units
 * the calculator didn't imply.
 */
export function formatScenarioValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  const k = key.toLowerCase();
  const num = typeof value === "number" ? value : Number(value);
  const isNumeric = typeof value === "number" || (value !== "" && !Number.isNaN(num));

  if (isNumeric) {
    const isPct = /(pct|percent|rate|yield|return|franking)/.test(k);
    const isMoney =
      /(amount|balance|salary|income|price|contrib|value|cost|deposit|super|saving|gain|loan|repayment|fee)/.test(
        k,
      );
    if (isPct && !isMoney) {
      return `${num.toLocaleString("en-AU", { maximumFractionDigits: 2 })}%`;
    }
    if (isMoney) {
      return num.toLocaleString("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 0,
      });
    }
    return num.toLocaleString("en-AU", { maximumFractionDigits: 2 });
  }

  return String(value);
}

/**
 * Flatten a scenario inputs/snapshot object into display fields. Skips nested
 * objects/arrays (the URL handoff only round-trips scalars anyway) and caps the
 * field count so a pathological blob can't blow up the page. Order is stable
 * (insertion order of the source object).
 */
export function scenarioFields(
  blob: Record<string, unknown> | null | undefined,
  limit = 40,
): ScenarioField[] {
  if (!blob) return [];
  const out: ScenarioField[] = [];
  for (const [key, value] of Object.entries(blob)) {
    if (value !== null && typeof value === "object") continue;
    out.push({
      key,
      label: humaniseFieldKey(key),
      display: formatScenarioValue(key, value),
    });
    if (out.length >= limit) break;
  }
  return out;
}
