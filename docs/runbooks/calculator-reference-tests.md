# Calculator regulator-reference tests

> Process runbook (not an incident runbook). Lives alongside the
> on-call runbooks because every calculator team will need it.

## Why this pattern exists

We ship calculators (franking credits, CGT, super contributions,
lump-sum, R&D tax incentive, negative gearing, …) that promise to
reproduce the math published by an Australian regulator (ATO,
ASIC's MoneySmart, AusIndustry, APRA). When our number drifts from
the regulator's number — even by a rounding decision — that's a
compliance and reputational risk:

- A reader who follows our number into a tax return and gets
  audited has a paper trail that points back to us.
- The ATO publishes worked examples with concrete inputs and
  outputs precisely so taxpayers can check their working. A
  calculator that disagrees with those examples is broken even if
  the math is "internally consistent."
- Calculators are part of our compliance posture (lib/compliance.ts
  governs the disclaimer copy; reference tests govern the math).

The regulator-reference test pattern pins each calculator to the
regulator's worked examples. A drift fails the test with the
source URL and accessed-at date in the error message, so a
maintainer can re-pull the published numbers and either update the
case (regulator changed) or fix the calculator (we're wrong).

## How the helper works

`__tests__/lib/calculator-reference.ts` exports
`assertCalculatorMatchesRegulator(calc, cases)`. Each case carries:

| Field           | Purpose                                                                                  |
|-----------------|------------------------------------------------------------------------------------------|
| `name`          | Human-readable label used in failure messages                                            |
| `regulator`     | Optional — "ATO", "ASIC", "AusIndustry", etc.                                            |
| `regulatorUrl`  | Absolute URL where the worked example is published                                       |
| `citation`      | Optional — section name, paragraph, FY year inside the URL                               |
| `accessedAt`    | ISO date (YYYY-MM-DD) you actually retrieved the example                                 |
| `inputs`        | Inputs from the worked example, passed verbatim to the calculator                        |
| `expectedOutput`| Outputs from the worked example, used as the regulator pin                               |
| `tolerance`     | `{ absolute?, relative? }`; default `{ relative: 0.005 }` (0.5%)                         |

The helper recurses through `expectedOutput`. Numeric leaves are
compared with the supplied tolerance; non-numeric leaves
(strings, booleans, null) must be strictly equal. **Extra keys in
the calculator output are ignored** — the regulator example only
has to pin the fields it publishes.

A failure produces a message like:

```
Calculator output drifted from ATO reference.
  case:        ATO canonical example — $700 fully franked, 30% marginal
  source:      https://www.ato.gov.au/...
  citation:    Section "How dividends are taxed" — fully franked …
  accessedAt:  2026-04-30
  field:       .frankingCredit
  problem:     actual=298.5, expected=300 (abs diff 1.500e+0, rel diff 0.5000%); tolerance={ absolute=0.01 }

If the regulator has updated this worked example, re-pull the
numbers and bump accessedAt. If the calculator is wrong, fix the
calculator — never the reference.
```

## Adding a new reference case

1. **Find a published worked example.** Required, not optional. The
   regulator must publish concrete numbers — not a formula. Good
   sources:
   - ATO: `https://www.ato.gov.au/...` worked examples on tax
     pages, super calculator help text, CGT decision trees.
   - ASIC MoneySmart: `https://moneysmart.gov.au/calculators` —
     each calculator typically has a "How we calculate" page with
     worked examples.
   - AusIndustry: RDTI (R&D Tax Incentive) explanatory examples.
   - APRA: super performance test methodology with worked numbers.
   If the regulator only publishes a formula (no numbers), the
   reference is no use — find a different example or skip.

2. **Copy inputs and outputs verbatim.** Do not "round to a clean
   number" — if the regulator publishes $1,428.57, write
   `1428.57`. If they publish $1,000 (whole dollars), write `1000`.
   Using whatever they publish is the whole point.

3. **Set `accessedAt` to the date you actually retrieved it.**
   Today's date in ISO format (YYYY-MM-DD). Yes this couples the
   test to a date — that is intentional. When the regulator
   updates the page, the next maintainer should re-pull and bump
   the date.

4. **Pick a tolerance.** Defaults to 0.5% relative. Tighten when:
   - **Regulator publishes whole-dollar numbers** → `absolute: 1`
     (or `0.01` if your calculator returns cents and you want to
     catch sub-dollar drift).
   - **Regulator publishes percentages (e.g. effective rate)** →
     keep relative, but consider `0.001` (0.1%) if the example is
     short.
   - **Regulator publishes exact cents** → `absolute: 0.01`.
   - **Regulator publishes thresholds (e.g. $300,000 cap)** →
     `absolute: 1` is plenty; the cap is a discrete number.
   You can pass both `absolute` and `relative`; the leaf passes if
   either is satisfied. This handles cases where a published whole
   number ($1,000,000) is naturally subject to relative drift but
   absolute drift would be the wrong measure.

5. **Wire it into a test.** File path:
   `__tests__/lib/<calc-name>-reference.test.ts`. Import the
   calculator, declare the cases, call
   `assertCalculatorMatchesRegulator(calc, cases)` from a single
   `it(...)` block. Run with `npm test -- __tests__/lib/<name>`.

### Example skeleton

```ts
import { describe, it } from "vitest";
import { computeMyCalc, type MyCalcResult } from "@/lib/my-calc";
import {
  assertCalculatorMatchesRegulator,
  type RegulatorReferenceCase,
} from "./calculator-reference";

const CASES: ReadonlyArray<
  RegulatorReferenceCase<Parameters<typeof computeMyCalc>[0], Partial<MyCalcResult>>
> = [
  {
    name: "ATO worked example — fully franked retiree",
    regulator: "ATO",
    regulatorUrl: "https://www.ato.gov.au/.../specific-page",
    citation: 'Section "Example: Rob"',
    accessedAt: "2026-04-30",
    inputs: { /* … */ },
    expectedOutput: { /* the fields the ATO publishes */ },
    tolerance: { absolute: 1 }, // ATO publishes whole dollars
  },
];

describe("my-calc reproduces ATO worked examples", () => {
  it("matches all reference cases", () => {
    assertCalculatorMatchesRegulator(computeMyCalc, CASES);
  });
});
```

## When tolerance should be tighter than the 0.5% default

The 0.5% default is a sensible "rounding-and-floating-point" budget.
Tighten it any time the regulator's number is more precise than 0.5%
warrants. Specifically:

| Regulator publishes…                        | Tolerance                  |
|---------------------------------------------|----------------------------|
| Whole dollars (e.g. $1,000)                 | `{ absolute: 1 }`          |
| Whole cents (e.g. $1,428.57)                | `{ absolute: 0.01 }`       |
| Percentages with 1 decimal (e.g. 32.5%)     | `{ absolute: 0.001 }`      |
| Whole-dollar amounts but rounded internally | `{ absolute: 0.01 }`       |
| Discrete thresholds (e.g. $300k contribution cap) | `{ absolute: 1 }`     |
| Approximations explicitly flagged "≈"       | `{ relative: 0.005 }` (default) |
| Compound interest / multi-period            | `{ absolute: 1, relative: 0.005 }` (either passes) |

If you find yourself reaching for a relative tolerance wider than
1% to make a test pass, **stop**. Either the regulator and the
calculator disagree (a real bug — file the issue, do not silently
widen tolerance), or the case is calling out the wrong fields.

## When the regulator changes the worked example

This is the workflow the pattern is designed around:

1. Test fails. The error message names the URL and `accessedAt`.
2. Open the URL. Compare the numbers on the page to the case.
3. **If the page numbers match the case** but the calculator
   disagrees → the calculator is wrong. Fix the calculator. Do
   not touch the reference.
4. **If the page numbers differ from the case** (regulator updated
   the example, perhaps for a new financial year) → re-pull the
   numbers, update `inputs` / `expectedOutput`, bump `accessedAt`
   to today's date. Commit with a `test:` subject explaining what
   the regulator changed and when.
5. **If the page is gone (broken link)** → find the equivalent
   current page, update `regulatorUrl` and `accessedAt` together.
   If the regulator no longer publishes the example at all, decide
   whether the case still has value (sometimes the math is stable
   enough that the original example is still a reasonable pin —
   keep it but add a comment; sometimes it should be deleted).

## When the helper should NOT be used

- For internal-only math with no regulator equivalent (e.g. our
  own scoring algorithms, ranking heuristics, A/B test
  assignment). Use ordinary unit tests instead — there's no
  regulator pin.
- For UI display formatting (currency, dates, locale). The
  helper compares values, not formatted strings.
- For anything where the "regulator" is actually a textbook or a
  market data provider. The pattern works there in principle, but
  the citation field becomes weaker; consider whether the source
  URL is genuinely durable.

## Related

- `__tests__/lib/calculator-reference.ts` — helper implementation
- `__tests__/lib/calculator-reference.test.ts` — helper self-tests
- `__tests__/lib/franking-math-reference.test.ts` — first concrete
  proof, pinned against ATO franking credit guidance
- `lib/franking-math.ts` — first calculator under the pattern
- `CONTRIBUTING.md` — Conventional Commit subjects (`test:` for
  pure additions, `fix:` if you correct calculator math to
  reproduce the regulator)
