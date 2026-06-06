/**
 * Minimal 5-field cron expression matcher (minute hour day-of-month month
 * day-of-week). Supports the forms used by this project's schedules:
 *   *            wildcard
 *   N            a single value
 *   A,B,C        a value list
 *   A-B          an inclusive range
 *   * / N         a step (e.g. "* / 15")  (written without the space)
 *
 * Used by the Netlify scheduled-function cron bridge (netlify/functions/
 * cron-tick) to decide which vercel.json schedules are due "now" while
 * production runs on the Netlify mirror (Vercel Cron is parked). Pure +
 * dependency-free so it is trivially unit-testable and edge/runtime-agnostic.
 *
 * Day-of-week is 0-6 with Sunday = 0 (cron standard). Both DOM and DOW
 * restricting is treated as OR (cron's historical quirk); the project only
 * uses "*" for both today, so this is for completeness.
 */

function fieldMatches(field: string, value: number, min: number, max: number): boolean {
  if (field === "*") return true;
  for (const part of field.split(",")) {
    if (part.includes("/")) {
      const [range, stepStr] = part.split("/");
      const step = Number(stepStr);
      if (!Number.isFinite(step) || step <= 0) continue;
      let lo = min;
      let hi = max;
      if (range && range !== "*") {
        if (range.includes("-")) {
          const [a, b] = range.split("-").map(Number);
          lo = a;
          hi = b;
        } else {
          lo = Number(range);
          hi = max;
        }
      }
      for (let v = lo; v <= hi; v += step) {
        if (v === value) return true;
      }
      continue;
    }
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      if (value >= a && value <= b) return true;
      continue;
    }
    if (Number(part) === value) return true;
  }
  return false;
}

/**
 * True when `expr` (a standard 5-field cron string) is due at `date` (UTC).
 * Returns false for malformed expressions rather than throwing.
 */
export function cronMatches(expr: string, date: Date): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const [minF, hourF, domF, monF, dowF] = fields;
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dom = date.getUTCDate();
  const mon = date.getUTCMonth() + 1; // 1-12
  const dow = date.getUTCDay(); // 0-6, Sun=0

  if (!fieldMatches(minF, minute, 0, 59)) return false;
  if (!fieldMatches(hourF, hour, 0, 23)) return false;
  if (!fieldMatches(monF, mon, 1, 12)) return false;

  // DOM/DOW OR-semantics when both are restricted.
  const domRestricted = domF !== "*";
  const dowRestricted = dowF !== "*";
  if (domRestricted && dowRestricted) {
    return fieldMatches(domF, dom, 1, 31) || fieldMatches(dowF, dow, 0, 6);
  }
  return fieldMatches(domF, dom, 1, 31) && fieldMatches(dowF, dow, 0, 6);
}
