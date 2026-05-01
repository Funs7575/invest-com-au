/**
 * Fixture for the `invest/no-unvalidated-req-json` ESLint rule (Stream E,
 * E-03). The companion test (`no-unvalidated-req-json.test.ts`) lints this
 * file with the rule ON and asserts which lines warn.
 *
 * Each case is annotated with `// CASE <id>: <expectation>` so the test can
 * cross-reference expected warning lines against the comments here.
 *
 * The fixture is NEVER imported by production code; it exists purely as a
 * lint input. The companion test wires an isolated ESLint instance whose
 * config enables ONLY `invest/no-unvalidated-req-json`, so unused-var /
 * unused-import / next-lint warnings are silent here by construction. We
 * deliberately do NOT add a top-of-file `eslint-disable` because that would
 * also disable the rule we're testing.
 *
 * The fixture is also exempted from the project's lint via the
 * `__tests__/**` ignore in `eslint.config.mjs` (the rule is OFF for tests).
 */

// Stand-in shapes — the rule is purely lexical, it doesn't care about
// runtime types. These declarations satisfy TypeScript so the fixture
// type-checks alongside the rest of the test suite.
declare const Schema: { parse: (x: unknown) => unknown; safeParse: (x: unknown) => unknown };
declare function withValidatedBody<T, R>(s: T, h: (r: unknown, b: unknown) => R): R;

// CASE V1 (valid): inline parse via Schema.parse — the canonical shape.
async function caseV1(req: { json: () => Promise<unknown> }) {
  const body = Schema.parse(await req.json());
  return body;
}

// CASE V2 (valid): safeParse variant.
async function caseV2(req: { json: () => Promise<unknown> }) {
  const result = Schema.safeParse(await req.json());
  return result;
}

// CASE V3 (valid): then-chain hands the body off to a parser.
async function caseV3(req: { json: () => Promise<unknown> }) {
  const body = await req.json().then((d) => Schema.parse(d));
  return body;
}

// CASE V4 (valid): intermediate variable consumed by parse later in scope.
async function caseV4(req: { json: () => Promise<unknown> }) {
  const raw = await req.json();
  const body = Schema.parse(raw);
  return body;
}

// CASE V5 (valid): withValidatedBody wrapper. The outer arrow is the route
// handler; `req.json()` is *inside* the wrapper's implementation, not here.
const caseV5 = withValidatedBody(Schema, async (_req, body) => body);

// CASE V6 (valid): inline disable comment for a deliberately untyped read.
async function caseV6(req: { json: () => Promise<unknown> }) {
  // eslint-disable-next-line invest/no-unvalidated-req-json -- legacy debug endpoint, body intentionally opaque
  const raw = await req.json();
  return raw;
}

// CASE I1 (INVALID): bare await req.json() with no validation.
async function caseI1(req: { json: () => Promise<unknown> }) {
  const body = await req.json();
  return body;
}

// CASE I2 (INVALID): destructuring shape — same problem, common pattern.
async function caseI2(request: { json: () => Promise<unknown> }) {
  const { id } = (await request.json()) as { id: string };
  return id;
}

// CASE I3 (INVALID): defensive `.catch(() => ({}))` doesn't satisfy
// validation — the body is still untyped after the catch.
async function caseI3(req: { json: () => Promise<unknown> }) {
  const body = await req.json().catch(() => ({}));
  return body;
}

// Touch every case so TypeScript's noUnusedLocals (if ever flipped on)
// doesn't strip them. Keeps the fixture self-contained.
export const __fixture_cases = {
  caseV1,
  caseV2,
  caseV3,
  caseV4,
  caseV5,
  caseV6,
  caseI1,
  caseI2,
  caseI3,
};
