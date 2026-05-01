/**
 * Stream O, iter 6 — RLS verification for the five forum/community tables.
 *
 * Verifies the migration `supabase/migrations/20260429_o_iter6_rls_forum.sql`:
 *
 *   1. Presence: ENABLE RLS + FORCE RLS for every table; service_role full
 *      access policy on every table; the role-scoped read/write policies
 *      described in the migration header.
 *   2. Enforcement: the policy WHERE / WITH CHECK clauses encode the
 *      stated guarantees:
 *        - Anon CAN read categories / profiles / threads / posts.
 *        - Anon CANNOT read forum_votes (no anon SELECT policy).
 *        - Anon CANNOT write any forum table (no anon INSERT/UPDATE/DELETE
 *          policy granted on any of the five tables).
 *        - Authenticated user A cannot UPDATE rows whose author_id /
 *          voter_user_id / user_id is user B's — the USING clause
 *          restricts visibility to (author|voter_user|user)_id =
 *          auth.uid(), and the WITH CHECK clause prevents reassignment.
 *
 * The Supabase-fake harness in __tests__/integration/harness.ts does NOT
 * actually execute Postgres RLS, so the "enforcement" assertions take the
 * shape of static checks against the migration SQL: we parse the policy
 * text and confirm the relevant clauses are wired exactly as expected.
 * This catches the obvious regressions (a missing `auth.uid()` predicate,
 * a stray FOR ALL TO authenticated, an anon write policy crept in) which
 * is the same bar the existing RLS migration gate (B-07) enforces.
 *
 * rls-isolation: forum_threads
 * rls-isolation: forum_posts
 * rls-isolation: forum_votes
 * rls-isolation: forum_user_profiles
 */

import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase/migrations/20260429_o_iter6_rls_forum.sql",
);

const FORUM_TABLES = [
  "forum_categories",
  "forum_user_profiles",
  "forum_threads",
  "forum_posts",
  "forum_votes",
] as const;

type ForumTable = (typeof FORUM_TABLES)[number];

let sql = "";

beforeAll(async () => {
  sql = await fs.readFile(MIGRATION_PATH, "utf8");
});

// ─── Helpers ───────────────────────────────────────────────────

function hasEnableRls(table: string): boolean {
  return new RegExp(
    `ALTER\\s+TABLE\\s+(?:public\\.)?${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  ).test(sql);
}

function hasForceRls(table: string): boolean {
  return new RegExp(
    `ALTER\\s+TABLE\\s+(?:public\\.)?${table}\\s+FORCE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  ).test(sql);
}

/**
 * Returns the body of every CREATE POLICY block targetting the given
 * table.  Captures from `CREATE POLICY` through to the next `;` so we
 * can inspect the full clause (FOR / TO / USING / WITH CHECK).
 */
function policiesFor(table: ForumTable): string[] {
  const re = new RegExp(
    `CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+(?:public\\.)?${table}[\\s\\S]*?;`,
    "gi",
  );
  return sql.match(re) ?? [];
}

function policyByName(table: ForumTable, name: string): string | undefined {
  const re = new RegExp(
    `CREATE\\s+POLICY\\s+"${name}"\\s+ON\\s+(?:public\\.)?${table}[\\s\\S]*?;`,
    "i",
  );
  return sql.match(re)?.[0];
}

// ─── 1. Presence: every table has RLS enabled + FORCEd ────────

describe("O-iter6 RLS — RLS enabled on every forum table", () => {
  for (const table of FORUM_TABLES) {
    it(`${table} has ENABLE ROW LEVEL SECURITY`, () => {
      expect(hasEnableRls(table)).toBe(true);
    });
    it(`${table} has FORCE ROW LEVEL SECURITY`, () => {
      expect(hasForceRls(table)).toBe(true);
    });
    it(`${table} has a service_role full access policy`, () => {
      const pol = policyByName(table, "service_role full access");
      expect(pol).toBeDefined();
      expect(pol).toMatch(/FOR\s+ALL\s+TO\s+service_role/i);
      expect(pol).toMatch(/USING\s*\(\s*true\s*\)/i);
      expect(pol).toMatch(/WITH\s+CHECK\s*\(\s*true\s*\)/i);
    });
  }
});

// ─── 2. Public read where expected ────────────────────────────

describe("O-iter6 RLS — anon read access", () => {
  for (const table of [
    "forum_categories",
    "forum_user_profiles",
    "forum_threads",
    "forum_posts",
  ] as const) {
    it(`${table} grants SELECT to anon`, () => {
      const pol = policyByName(table, "public read");
      expect(pol).toBeDefined();
      expect(pol).toMatch(/FOR\s+SELECT/i);
      // both anon and authenticated must be in the role list
      expect(pol).toMatch(/TO\s+anon\s*,\s*authenticated/i);
      expect(pol).toMatch(/USING\s*\(\s*true\s*\)/i);
    });
  }

  it("forum_votes does NOT grant SELECT to anon", () => {
    const pols = policiesFor("forum_votes");
    // No policy on forum_votes may target anon at all.
    for (const p of pols) {
      expect(p).not.toMatch(/\bTO\s+[^;]*\banon\b/i);
    }
  });
});

// ─── 3. Anon CANNOT write on any table ────────────────────────

describe("O-iter6 RLS — anon write blocked everywhere", () => {
  for (const table of FORUM_TABLES) {
    it(`${table} grants no anon INSERT/UPDATE/DELETE policy`, () => {
      const pols = policiesFor(table);
      for (const p of pols) {
        const isWrite = /FOR\s+(INSERT|UPDATE|DELETE|ALL)\b/i.test(p);
        if (!isWrite) continue;
        // service_role-targeted FOR ALL is fine; flag anything that
        // mentions anon on a write op.
        const targetsAnon = /\bTO\s+[^;]*\banon\b/i.test(p);
        expect(
          targetsAnon,
          `Anon must not appear on a write policy for ${table}: ${p}`,
        ).toBe(false);
      }
    });
  }
});

// ─── 4. Owner-scoped writes pin the user/author column ────────

describe("O-iter6 RLS — owner-scoped writes", () => {
  it("forum_user_profiles UPDATE is scoped to user_id = auth.uid()", () => {
    const pol = policyByName("forum_user_profiles", "owner can update");
    expect(pol).toBeDefined();
    expect(pol).toMatch(/FOR\s+UPDATE\s+TO\s+authenticated/i);
    // Both USING and WITH CHECK must pin user_id to auth.uid()
    expect(pol).toMatch(/USING\s*\(\s*user_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)\s*\)/i);
    expect(pol).toMatch(/WITH\s+CHECK\s*\(\s*user_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)\s*\)/i);
  });

  it("forum_threads INSERT pins author_id = auth.uid() and forbids self-flag", () => {
    const pol = policyByName("forum_threads", "author can insert");
    expect(pol).toBeDefined();
    expect(pol).toMatch(/FOR\s+INSERT\s+TO\s+authenticated/i);
    expect(pol).toMatch(/author_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)/i);
    // Defence-in-depth: cannot self-set moderation flags on insert.
    expect(pol).toMatch(/is_pinned\s*=\s*false/i);
    expect(pol).toMatch(/is_locked\s*=\s*false/i);
    expect(pol).toMatch(/is_removed\s*=\s*false/i);
  });

  it("forum_threads UPDATE — user A cannot mutate user B's thread", () => {
    const pol = policyByName("forum_threads", "author can update");
    expect(pol).toBeDefined();
    expect(pol).toMatch(/FOR\s+UPDATE\s+TO\s+authenticated/i);
    // USING gates row visibility — user A's WHERE auth.uid() != row.author_id
    // matches zero rows, so the UPDATE simply affects nothing.
    expect(pol).toMatch(/USING\s*\([^)]*author_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)/i);
    // WITH CHECK pins author_id so the row can't be reassigned mid-update.
    expect(pol).toMatch(/WITH\s+CHECK\s*\([^;]*author_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)/i);
  });

  it("forum_posts INSERT pins author_id = auth.uid()", () => {
    const pol = policyByName("forum_posts", "author can insert");
    expect(pol).toBeDefined();
    expect(pol).toMatch(/FOR\s+INSERT\s+TO\s+authenticated/i);
    expect(pol).toMatch(/author_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)/i);
    // Cannot self-mark a reply as the answer.
    expect(pol).toMatch(/is_answer\s*=\s*false/i);
    expect(pol).toMatch(/is_removed\s*=\s*false/i);
  });

  it("forum_posts UPDATE — user A cannot mutate user B's post", () => {
    const pol = policyByName("forum_posts", "author can update");
    expect(pol).toBeDefined();
    expect(pol).toMatch(/FOR\s+UPDATE\s+TO\s+authenticated/i);
    expect(pol).toMatch(/USING\s*\(\s*author_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)\s*\)/i);
    expect(pol).toMatch(/WITH\s+CHECK\s*\([^;]*author_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)/i);
  });

  it("forum_votes — every authenticated CRUD policy pins voter_user_id", () => {
    for (const name of [
      "owner can read",
      "owner can insert",
      "owner can update",
      "owner can delete",
    ]) {
      const pol = policyByName("forum_votes", name);
      expect(pol, `forum_votes policy "${name}" must exist`).toBeDefined();
      expect(pol).toMatch(/TO\s+authenticated/i);
      expect(pol).toMatch(/voter_user_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)/i);
    }
  });

  it("forum_votes UPDATE — user A cannot vote as user B (USING + WITH CHECK)", () => {
    const pol = policyByName("forum_votes", "owner can update");
    expect(pol).toBeDefined();
    // Both USING (visibility) and WITH CHECK (post-image) must pin
    // voter_user_id, so an UPDATE attempt against another user's vote
    // either matches zero rows (USING) or is rejected (WITH CHECK).
    expect(pol).toMatch(/USING\s*\(\s*voter_user_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)\s*\)/i);
    expect(pol).toMatch(/WITH\s+CHECK\s*\(\s*voter_user_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)\s*\)/i);
  });
});

// ─── 5. Idempotency: every CREATE POLICY has a paired DROP IF EXISTS ─

describe("O-iter6 RLS — migration is idempotent", () => {
  it("every CREATE POLICY is preceded by a DROP POLICY IF EXISTS", () => {
    const created = [...sql.matchAll(/CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?(\w+)/gi)];
    const dropped = new Set(
      [...sql.matchAll(/DROP\s+POLICY\s+IF\s+EXISTS\s+"([^"]+)"\s+ON\s+(?:public\.)?(\w+)/gi)].map(
        (m) => `${m[2]}::${m[1]}`,
      ),
    );
    for (const m of created) {
      const key = `${m[2]}::${m[1]}`;
      expect(dropped.has(key), `Missing DROP POLICY IF EXISTS for ${key}`).toBe(true);
    }
  });

  it("rollback notes appear in the header", () => {
    const header = sql.split("BEGIN;")[0] ?? "";
    expect(header).toMatch(/Rollback/i);
    expect(header).toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  });
});
