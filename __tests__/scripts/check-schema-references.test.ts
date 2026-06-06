/**
 * Tests for scripts/check-schema-references.mjs — the phantom-table sentinel.
 *
 * Exercises the exported pure helpers directly (no network, no child process).
 * The main() runner is a thin wrapper whose end-to-end behaviour is covered by
 * the creds-gated CI job; the parsing logic that determines a pass/fail lives
 * in these helpers, so that's what we assert.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";

const gatePath = join(process.cwd(), "scripts/check-schema-references.mjs");

let parseOpenApiSchema: (doc: unknown) => { relations: Set<string>; functions: Set<string> };
let findSchemaRefs: (code: string) => { kind: "from" | "rpc"; name: string; line: number }[];
let parseAllowlist: (text: string) => Set<string>;
let isKnown: (
  ref: { kind: "from" | "rpc"; name: string },
  schema: { relations: Set<string>; functions: Set<string> },
) => boolean;

beforeAll(async () => {
  const mod = await import(gatePath);
  parseOpenApiSchema = mod.parseOpenApiSchema;
  findSchemaRefs = mod.findSchemaRefs;
  parseAllowlist = mod.parseAllowlist;
  isKnown = mod.isKnown;
});

describe("parseOpenApiSchema", () => {
  it("reads relations from Swagger 2 `definitions` and RPCs from `/rpc/*` paths", () => {
    const { relations, functions } = parseOpenApiSchema({
      definitions: { brokers: {}, professionals: {}, advisor_billing: {} },
      paths: { "/brokers": {}, "/rpc/get_active_count": {}, "/rpc/score_quiz": {} },
    });
    expect(relations.has("brokers")).toBe(true);
    expect(relations.has("advisor_billing")).toBe(true);
    expect(functions.has("get_active_count")).toBe(true);
    expect(functions.has("score_quiz")).toBe(true);
    expect(relations.has("get_active_count")).toBe(false);
  });

  it("supports OpenAPI 3 `components.schemas`", () => {
    const { relations } = parseOpenApiSchema({ components: { schemas: { leads: {} } }, paths: {} });
    expect(relations.has("leads")).toBe(true);
  });

  it("ignores non-identifier definition keys (e.g. synthetic rpc arg schemas)", () => {
    const { relations } = parseOpenApiSchema({ definitions: { brokers: {}, "(rpc) foo": {} }, paths: {} });
    expect(relations.has("brokers")).toBe(true);
    expect(relations.size).toBe(1);
  });
});

describe("findSchemaRefs", () => {
  it("captures .from() and .rpc() string-literal targets with line numbers", () => {
    const code = ['const a = supabase.from("brokers");', 'await db.rpc("score_quiz");'].join("\n");
    const refs = findSchemaRefs(code);
    expect(refs).toEqual([
      { kind: "from", name: "brokers", line: 1 },
      { kind: "rpc", name: "score_quiz", line: 2 },
    ]);
  });

  it("strips a public. schema qualifier", () => {
    expect(findSchemaRefs('x.from("public.brokers")')[0]).toMatchObject({ name: "brokers" });
  });

  it("skips JS builtins (Array.from / Buffer.from)", () => {
    const refs = findSchemaRefs('const xs = Array.from("abc"); Buffer.from("zz");');
    expect(refs).toEqual([]);
  });

  it("skips dynamic args (variables and template interpolation)", () => {
    const code = "a.from(tableName); b.from(`weights_${kind}`); c.from(`${t}`);";
    expect(findSchemaRefs(code)).toEqual([]);
  });

  it("does not treat a bare .from(\"public\") as a relation", () => {
    expect(findSchemaRefs('x.from("public")')).toEqual([]);
  });

  it("handles chained calls after a paren (createClient().from(...))", () => {
    expect(findSchemaRefs('createAdminClient().from("weights")')[0]).toMatchObject({
      kind: "from",
      name: "weights",
    });
  });
});

describe("parseAllowlist", () => {
  it("parses prefixed + bare entries and ignores comments/blanks", () => {
    const set = parseAllowlist(["from:weights # backlog", "rpc:foo", "bare_table", "  # comment", ""].join("\n"));
    expect(set.has("from:weights")).toBe(true);
    expect(set.has("rpc:foo")).toBe(true);
    expect(set.has("from:bare_table")).toBe(true); // bare defaults to from:
    expect(set.size).toBe(3);
  });
});

describe("isKnown", () => {
  const schema = { relations: new Set(["brokers"]), functions: new Set(["score_quiz"]) };
  it("resolves from-refs against relations and rpc-refs against functions", () => {
    expect(isKnown({ kind: "from", name: "brokers" }, schema)).toBe(true);
    expect(isKnown({ kind: "from", name: "score_quiz" }, schema)).toBe(false); // fn isn't a relation
    expect(isKnown({ kind: "rpc", name: "score_quiz" }, schema)).toBe(true);
    expect(isKnown({ kind: "from", name: "ghost_table" }, schema)).toBe(false);
  });
});
