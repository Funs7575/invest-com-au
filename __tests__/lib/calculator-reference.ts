/**
 * Calculator regulator-reference test helper.
 *
 * Why this exists
 * ----------------
 * We ship calculators (franking, CGT, super contributions, lump-sum,
 * R&D tax, negative gearing, …) that promise to reproduce the math
 * an Australian regulator (ATO, ASIC's MoneySmart, AusIndustry, …)
 * publishes in its own worked examples. If our number drifts from
 * the regulator's number — even by a rounding decision — that's a
 * compliance and reputational risk: a reader who follows our number
 * into a tax return and gets audited has a paper trail that points
 * back to us.
 *
 * The fix is a regression-style test that takes the regulator's
 * published worked example verbatim, feeds the inputs to our
 * calculator, and asserts the output matches within an explicit
 * tolerance. When the regulator updates its example (rates change,
 * new offsets, new thresholds), the test fails loudly with the
 * source URL + accessedAt date in the error message so a maintainer
 * can re-pull the published numbers and update the case.
 *
 * Pattern
 * --------
 *  1. Find the regulator's worked example (URL with concrete
 *     inputs + outputs).
 *  2. Copy inputs/outputs verbatim into a `RegulatorReferenceCase`.
 *  3. Set `accessedAt` to the ISO date you actually retrieved it.
 *  4. Pick a tolerance:
 *       - regulator publishes whole dollars → `absolute: 1` (≤ $1)
 *       - regulator publishes percentages → `relative: 0.005` (0.5%)
 *       - regulator publishes exact cents → `absolute: 0.01`
 *  5. Call `assertCalculatorMatchesRegulator(calc, [case])`.
 *
 * The helper does a deep walk of expected vs actual output. Numeric
 * leaves are compared with the supplied tolerance; non-numeric leaves
 * (strings, booleans) must be strictly equal. Mismatches throw with
 * a message that includes the case name, the regulator URL, the
 * accessedAt date, the path to the failing leaf, and both numbers.
 *
 * This file is a pure test utility — no Node, no DOM, no fetch. The
 * regulator URL is captured for audit traceability, never fetched
 * at runtime.
 */

import { expect } from "vitest";

/** Default relative tolerance: 0.5% of expected. */
export const DEFAULT_RELATIVE_TOLERANCE = 0.005;

export interface ReferenceTolerance {
  /**
   * Maximum absolute difference allowed between actual and expected
   * (e.g. 0.01 = within one cent). If both `absolute` and `relative`
   * are set, the leaf passes if EITHER is satisfied — this matches
   * the practical reality that the regulator publishes whole-dollar
   * numbers but also rounds, so for small amounts the relative
   * tolerance can be stricter than the rounding gap.
   */
  absolute?: number;
  /**
   * Maximum relative difference allowed (fraction of expected, not
   * percent — pass `0.005` for 0.5%). Falls back to
   * {@link DEFAULT_RELATIVE_TOLERANCE} if neither is set.
   */
  relative?: number;
}

export interface RegulatorReferenceCase<TInput, TOutput> {
  /** Human-readable case name used in failure messages. */
  name: string;
  /**
   * The exact URL where the worked example is published. Required
   * so that a future failure can be traced back to the source.
   */
  regulatorUrl: string;
  /**
   * ISO date (YYYY-MM-DD) you retrieved the example. When the
   * regulator updates the page, mismatches surface as test failures
   * and the maintainer should re-pull and bump this date.
   */
  accessedAt: string;
  /** Optional regulator name for clearer failure messages. */
  regulator?: string;
  /** Optional reference (section, paragraph, year) inside the URL. */
  citation?: string;
  /** The exact inputs from the regulator's example. */
  inputs: TInput;
  /** The exact outputs the regulator publishes for those inputs. */
  expectedOutput: TOutput;
  /**
   * Per-case tolerance override. Defaults to
   * `{ relative: DEFAULT_RELATIVE_TOLERANCE }`.
   */
  tolerance?: ReferenceTolerance;
}

/**
 * Assert that `calc(case.inputs)` reproduces every numeric leaf of
 * `case.expectedOutput` within the case tolerance.
 *
 * Iterates over an array of cases; each one is an independent
 * assertion. Throws on the first mismatch with a message that names
 * the regulator URL + accessedAt + the failing leaf path + both
 * numbers, so a future failure is traceable.
 */
export function assertCalculatorMatchesRegulator<TInput, TOutput>(
  calc: (input: TInput) => TOutput,
  cases: ReadonlyArray<RegulatorReferenceCase<TInput, TOutput>>,
): void {
  if (cases.length === 0) {
    throw new Error(
      "assertCalculatorMatchesRegulator: cases array is empty — " +
        "passing zero cases is almost always a bug (forgot to wire the " +
        "test, regulator URL not yet retrieved, etc.).",
    );
  }

  for (const c of cases) {
    validateCase(c);
    const actual = calc(c.inputs);
    const tol = c.tolerance ?? { relative: DEFAULT_RELATIVE_TOLERANCE };
    compareDeep(actual, c.expectedOutput, tol, c, []);
  }
}

/* ------------------------------------------------------------------ */
/* Internals                                                           */
/* ------------------------------------------------------------------ */

function validateCase<I, O>(c: RegulatorReferenceCase<I, O>): void {
  if (!c.name) {
    throw new Error("RegulatorReferenceCase.name is required");
  }
  if (!c.regulatorUrl) {
    throw new Error(
      `RegulatorReferenceCase[${c.name}].regulatorUrl is required — ` +
        "every reference case must cite a real published worked example",
    );
  }
  if (!/^https?:\/\//.test(c.regulatorUrl)) {
    throw new Error(
      `RegulatorReferenceCase[${c.name}].regulatorUrl must be an absolute ` +
        `URL (got: ${c.regulatorUrl})`,
    );
  }
  if (!c.accessedAt) {
    throw new Error(
      `RegulatorReferenceCase[${c.name}].accessedAt is required — ` +
        "without it we can't tell whether the regulator has updated the " +
        "page since the test was written",
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.accessedAt)) {
    throw new Error(
      `RegulatorReferenceCase[${c.name}].accessedAt must be ISO YYYY-MM-DD ` +
        `(got: ${c.accessedAt})`,
    );
  }
  const tol = c.tolerance;
  if (tol) {
    if (tol.absolute !== undefined && tol.absolute < 0) {
      throw new Error(
        `RegulatorReferenceCase[${c.name}].tolerance.absolute must be >= 0`,
      );
    }
    if (tol.relative !== undefined && tol.relative < 0) {
      throw new Error(
        `RegulatorReferenceCase[${c.name}].tolerance.relative must be >= 0`,
      );
    }
  }
}

function compareDeep(
  actual: unknown,
  expected: unknown,
  tolerance: ReferenceTolerance,
  c: RegulatorReferenceCase<unknown, unknown>,
  path: ReadonlyArray<string | number>,
): void {
  // Numeric leaves: tolerance comparison.
  if (typeof expected === "number") {
    if (typeof actual !== "number" || !Number.isFinite(actual)) {
      throw fail(
        c,
        path,
        `expected number ${expected}, got ${describe(actual)}`,
      );
    }
    if (!withinTolerance(actual, expected, tolerance)) {
      const diff = Math.abs(actual - expected);
      const rel =
        expected === 0 ? Infinity : Math.abs((actual - expected) / expected);
      throw fail(
        c,
        path,
        `actual=${actual}, expected=${expected} (abs diff ${diff.toExponential(
          3,
        )}, rel diff ${(rel * 100).toFixed(4)}%); ` +
          `tolerance=${formatTolerance(tolerance)}`,
      );
    }
    return;
  }

  // Strict equality for booleans / strings / null / undefined.
  if (
    expected === null ||
    expected === undefined ||
    typeof expected === "boolean" ||
    typeof expected === "string"
  ) {
    if (actual !== expected) {
      throw fail(
        c,
        path,
        `expected ${describe(expected)}, got ${describe(actual)}`,
      );
    }
    return;
  }

  // Arrays: recurse position-by-position.
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      throw fail(c, path, `expected array, got ${describe(actual)}`);
    }
    if (actual.length !== expected.length) {
      throw fail(
        c,
        path,
        `expected array length ${expected.length}, got ${actual.length}`,
      );
    }
    for (let i = 0; i < expected.length; i++) {
      compareDeep(actual[i], expected[i], tolerance, c, [...path, i]);
    }
    return;
  }

  // Plain objects: recurse on every key the regulator pinned. Extra
  // keys in the calculator output are fine — the regulator example
  // doesn't have to fully describe every field, only the ones it
  // publishes.
  if (typeof expected === "object") {
    if (typeof actual !== "object" || actual === null || Array.isArray(actual)) {
      throw fail(c, path, `expected object, got ${describe(actual)}`);
    }
    const exp = expected as Record<string, unknown>;
    const act = actual as Record<string, unknown>;
    for (const key of Object.keys(exp)) {
      if (!(key in act)) {
        throw fail(c, [...path, key], `key missing from calculator output`);
      }
      compareDeep(act[key], exp[key], tolerance, c, [...path, key]);
    }
    return;
  }

  // Anything else (function, symbol, bigint) — should never appear in
  // a regulator example, but treat strict-equal as the safe default.
  if (actual !== expected) {
    throw fail(
      c,
      path,
      `expected ${describe(expected)}, got ${describe(actual)}`,
    );
  }
}

function withinTolerance(
  actual: number,
  expected: number,
  tol: ReferenceTolerance,
): boolean {
  // If both are zero, exact equality is the only meaningful answer.
  if (actual === expected) return true;
  const diff = Math.abs(actual - expected);
  if (tol.absolute !== undefined && diff <= tol.absolute) return true;
  if (tol.relative !== undefined) {
    if (expected === 0) {
      // Relative tolerance is undefined when expected is zero —
      // require absolute tolerance to match in that case.
      return false;
    }
    if (diff / Math.abs(expected) <= tol.relative) return true;
  }
  // No tolerance fields set — fall back to default relative.
  if (tol.absolute === undefined && tol.relative === undefined) {
    if (expected === 0) return false;
    return diff / Math.abs(expected) <= DEFAULT_RELATIVE_TOLERANCE;
  }
  return false;
}

function describe(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `array(length=${v.length})`;
  if (typeof v === "object") return `object(keys=${Object.keys(v).join(",")})`;
  return typeof v;
}

function formatTolerance(t: ReferenceTolerance): string {
  const parts: string[] = [];
  if (t.absolute !== undefined) parts.push(`absolute=${t.absolute}`);
  if (t.relative !== undefined) parts.push(`relative=${t.relative * 100}%`);
  if (parts.length === 0) {
    parts.push(`relative=${DEFAULT_RELATIVE_TOLERANCE * 100}% (default)`);
  }
  return `{ ${parts.join(", ")} }`;
}

function fail(
  c: RegulatorReferenceCase<unknown, unknown>,
  path: ReadonlyArray<string | number>,
  reason: string,
): Error {
  const pathStr =
    path.length === 0 ? "<root>" : path.map(formatPathSegment).join("");
  const regulator = c.regulator ? `${c.regulator}` : "regulator";
  const citation = c.citation ? `\n  citation:    ${c.citation}` : "";
  const msg =
    `Calculator output drifted from ${regulator} reference.\n` +
    `  case:        ${c.name}\n` +
    `  source:      ${c.regulatorUrl}${citation}\n` +
    `  accessedAt:  ${c.accessedAt}\n` +
    `  field:       ${pathStr}\n` +
    `  problem:     ${reason}\n` +
    `\n` +
    `If the regulator has updated this worked example, re-pull the ` +
    `numbers and bump accessedAt. If the calculator is wrong, fix the ` +
    `calculator — never the reference.`;
  return new Error(msg);
}

function formatPathSegment(seg: string | number): string {
  return typeof seg === "number" ? `[${seg}]` : `.${seg}`;
}

/* ------------------------------------------------------------------ */
/* Vitest convenience: optional test-table runner                     */
/* ------------------------------------------------------------------ */

/**
 * Wrap each case in its own `expect(...).not.toThrow()` so a failure
 * surfaces only the offending case, not a single giant message. Use
 * inside a `describe` block. Optional — calling
 * `assertCalculatorMatchesRegulator` directly works too.
 */
export function expectMatchesRegulator<TInput, TOutput>(
  calc: (input: TInput) => TOutput,
  cases: ReadonlyArray<RegulatorReferenceCase<TInput, TOutput>>,
): void {
  if (cases.length === 0) {
    expect.fail(
      "expectMatchesRegulator received zero cases — wire the cases array",
    );
  }
  for (const c of cases) {
    expect(
      () => assertCalculatorMatchesRegulator(calc, [c]),
      `${c.name} (${c.regulatorUrl}, accessed ${c.accessedAt})`,
    ).not.toThrow();
  }
}
