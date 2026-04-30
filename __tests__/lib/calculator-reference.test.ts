/**
 * Tests for the calculator regulator-reference helper itself.
 *
 * The helper is the single contract every BB-* calculator inherits;
 * a bug here silently weakens every downstream reference test, so
 * we test the helper end-to-end before any real calculator depends
 * on it.
 */

import { describe, it, expect } from "vitest";
import {
  assertCalculatorMatchesRegulator,
  expectMatchesRegulator,
  DEFAULT_RELATIVE_TOLERANCE,
  type RegulatorReferenceCase,
} from "./calculator-reference";

const SAMPLE_URL =
  "https://www.ato.gov.au/individuals-and-families/investments-and-assets/investing-in-shares/dividends/you-and-your-shares";

function makeCase<I, O>(
  partial: Partial<RegulatorReferenceCase<I, O>> &
    Pick<RegulatorReferenceCase<I, O>, "inputs" | "expectedOutput">,
): RegulatorReferenceCase<I, O> {
  return {
    name: partial.name ?? "sample-case",
    regulatorUrl: partial.regulatorUrl ?? SAMPLE_URL,
    accessedAt: partial.accessedAt ?? "2026-04-30",
    regulator: partial.regulator,
    citation: partial.citation,
    inputs: partial.inputs,
    expectedOutput: partial.expectedOutput,
    tolerance: partial.tolerance,
  };
}

describe("assertCalculatorMatchesRegulator — happy path", () => {
  it("passes when output matches expected within default tolerance", () => {
    const calc = (n: number) => ({ doubled: n * 2 });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({ inputs: 21, expectedOutput: { doubled: 42 } }),
      ]),
    ).not.toThrow();
  });

  it("passes when output is within explicit relative tolerance", () => {
    // Calculator returns 100.4 but regulator publishes 100. Relative
    // diff = 0.4% < 0.5% → pass.
    const calc = () => ({ amount: 100.4 });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: { amount: 100 },
          tolerance: { relative: 0.005 },
        }),
      ]),
    ).not.toThrow();
  });

  it("passes when output is within explicit absolute tolerance", () => {
    const calc = () => ({ tax: 642.86 });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: { tax: 643 },
          tolerance: { absolute: 1 },
        }),
      ]),
    ).not.toThrow();
  });

  it("recurses into nested objects and arrays", () => {
    const calc = () => ({
      summary: { total: 1000, parts: [100, 200, 700] },
      label: "ok",
      flag: true,
    });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: {
            summary: { total: 1000, parts: [100, 200, 700] },
            label: "ok",
            flag: true,
          },
        }),
      ]),
    ).not.toThrow();
  });

  it("ignores extra keys in calculator output (regulator pin only)", () => {
    // Regulator publishes only `tax`, but our calculator also returns
    // `medicare`. Extra fields should not fail the reference check.
    const calc = () => ({ tax: 300, medicare: 20 });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({ inputs: null, expectedOutput: { tax: 300 } }),
      ]),
    ).not.toThrow();
  });
});

describe("assertCalculatorMatchesRegulator — drift detection", () => {
  it("throws when a numeric leaf is outside tolerance", () => {
    const calc = () => ({ tax: 350 });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          name: "drifted",
          inputs: null,
          expectedOutput: { tax: 300 },
        }),
      ]),
    ).toThrow(/Calculator output drifted/);
  });

  it("error message includes the regulator URL and accessedAt", () => {
    const calc = () => ({ tax: 350 });
    let caught: Error | null = null;
    try {
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          name: "drifted-citation",
          regulatorUrl: SAMPLE_URL,
          accessedAt: "2026-04-30",
          inputs: null,
          expectedOutput: { tax: 300 },
        }),
      ]);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).not.toBeNull();
    expect(caught?.message).toContain(SAMPLE_URL);
    expect(caught?.message).toContain("2026-04-30");
    expect(caught?.message).toContain("drifted-citation");
    expect(caught?.message).toContain(".tax");
  });

  it("includes array index in the path on mismatch", () => {
    const calc = () => ({ parts: [100, 200, 999] });
    let caught: Error | null = null;
    try {
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: { parts: [100, 200, 700] },
        }),
      ]);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught?.message).toMatch(/\.parts\[2\]/);
  });

  it("throws on length mismatch in arrays", () => {
    const calc = () => ({ parts: [1, 2] });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: { parts: [1, 2, 3] },
        }),
      ]),
    ).toThrow(/array length/);
  });

  it("throws when calculator returns wrong type", () => {
    const calc = () => ({ tax: "300" }) as unknown as { tax: number };
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: { tax: 300 },
        }),
      ]),
    ).toThrow(/expected number 300/);
  });

  it("throws when calculator omits a key the regulator pins", () => {
    const calc = () => ({}) as unknown as { tax: number };
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: { tax: 300 },
        }),
      ]),
    ).toThrow(/key missing from calculator output/);
  });

  it("throws when string field differs", () => {
    const calc = () => ({ status: "owe" });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: { status: "refund" },
        }),
      ]),
    ).toThrow(/expected "refund"/);
  });
});

describe("assertCalculatorMatchesRegulator — tolerance edge cases", () => {
  it("relative tolerance fails when expected is zero (must use absolute)", () => {
    const calc = () => ({ x: 0.001 });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: { x: 0 },
          tolerance: { relative: 0.005 },
        }),
      ]),
    ).toThrow();
    // But absolute tolerance handles the zero-expected case fine.
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: { x: 0 },
          tolerance: { absolute: 0.01 },
        }),
      ]),
    ).not.toThrow();
  });

  it("absolute OR relative — passes if either holds", () => {
    // Regulator value 1,000,000; calculator returns 1,000,005. Diff
    // = 5 (above absolute=1) but relative = 0.0005% (below 0.5%).
    const calc = () => ({ x: 1_000_005 });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: { x: 1_000_000 },
          tolerance: { absolute: 1, relative: 0.005 },
        }),
      ]),
    ).not.toThrow();
  });

  it("default tolerance is 0.5% relative", () => {
    expect(DEFAULT_RELATIVE_TOLERANCE).toBe(0.005);
    // 0.6% drift fails the default.
    const tooMuch = () => ({ x: 100.6 });
    expect(() =>
      assertCalculatorMatchesRegulator(tooMuch, [
        makeCase({ inputs: null, expectedOutput: { x: 100 } }),
      ]),
    ).toThrow();
    // 0.4% drift passes the default.
    const justOk = () => ({ x: 100.4 });
    expect(() =>
      assertCalculatorMatchesRegulator(justOk, [
        makeCase({ inputs: null, expectedOutput: { x: 100 } }),
      ]),
    ).not.toThrow();
  });

  it("rejects negative tolerance values", () => {
    const calc = () => ({ x: 1 });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        makeCase({
          inputs: null,
          expectedOutput: { x: 1 },
          tolerance: { absolute: -1 },
        }),
      ]),
    ).toThrow(/tolerance.absolute must be >= 0/);
  });
});

describe("assertCalculatorMatchesRegulator — input validation", () => {
  it("rejects empty cases array", () => {
    const calc = () => 1;
    expect(() => assertCalculatorMatchesRegulator(calc, [])).toThrow(
      /cases array is empty/,
    );
  });

  it("rejects missing regulatorUrl", () => {
    const calc = () => ({ x: 1 });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        {
          name: "no-url",
          regulatorUrl: "",
          accessedAt: "2026-04-30",
          inputs: null,
          expectedOutput: { x: 1 },
        },
      ]),
    ).toThrow(/regulatorUrl is required/);
  });

  it("rejects non-http regulator URL", () => {
    const calc = () => ({ x: 1 });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        {
          name: "bad-url",
          regulatorUrl: "ato.gov.au/x",
          accessedAt: "2026-04-30",
          inputs: null,
          expectedOutput: { x: 1 },
        },
      ]),
    ).toThrow(/must be an absolute URL/);
  });

  it("rejects malformed accessedAt", () => {
    const calc = () => ({ x: 1 });
    expect(() =>
      assertCalculatorMatchesRegulator(calc, [
        {
          name: "bad-date",
          regulatorUrl: SAMPLE_URL,
          accessedAt: "30 April 2026",
          inputs: null,
          expectedOutput: { x: 1 },
        },
      ]),
    ).toThrow(/must be ISO YYYY-MM-DD/);
  });
});

describe("expectMatchesRegulator — convenience wrapper", () => {
  it("delegates to assertCalculatorMatchesRegulator per-case", () => {
    const calc = (n: number) => ({ doubled: n * 2 });
    expectMatchesRegulator(calc, [
      makeCase({ name: "case-a", inputs: 1, expectedOutput: { doubled: 2 } }),
      makeCase({ name: "case-b", inputs: 5, expectedOutput: { doubled: 10 } }),
    ]);
  });
});
