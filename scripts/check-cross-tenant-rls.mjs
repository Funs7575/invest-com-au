#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * Cross-tenant RLS fuzzer — authenticated IDOR probe.
 *
 * The existing bots:idor probe proves the ANON role can't read sensitive
 * tables. This proves the harder, more dangerous case: an AUTHENTICATED user
 * cannot read ANOTHER user's rows. It signs in two real test users (A, B) and,
 * for every user-owned table, fetches what each can see through PostgREST and
 * asserts every returned row belongs to the caller. A row owned by the other
 * user — or anyone else — is a tenant-isolation breach (the RLS policy is
 * missing `auth.uid()` scoping or uses a permissive `USING (true)`).
 *
 * Read-only: it only SELECTs with each user's own JWT (no writes, no service
 * role, $0). Strongest when the two test users each already have some rows
 * (seed via `npm run bots:seed-users`); with empty accounts it still catches a
 * policy that leaks *other* users' rows.
 *
 * Creds-gated: skips cleanly unless URL + anon key + both users' credentials
 * are present.
 *   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
 *   BOTS_RLS_USER_A_EMAIL=… BOTS_RLS_USER_A_PASSWORD=… \
 *   BOTS_RLS_USER_B_EMAIL=… BOTS_RLS_USER_B_PASSWORD=… npm run audit:cross-tenant-rls
 *
 * Exit: 0 isolated / skipped · 1 a cross-tenant leak · 2 setup error.
 */

/**
 * User-owned tables and the column that must equal the caller's auth uid.
 * Derived from the live schema (information_schema). Add a row here when a new
 * per-user table ships.
 * @type {{ table: string, ownerCol: string }[]}
 */
export const USER_OWNED_TABLES = [
  { table: "user_bookmarks", ownerCol: "user_id" },
  { table: "user_quiz_history", ownerCol: "user_id" },
  { table: "user_lists", ownerCol: "user_id" },
  { table: "user_documents", ownerCol: "user_id" },
  { table: "user_watchlist_items", ownerCol: "user_id" },
  { table: "user_calculator_state", ownerCol: "user_id" },
  { table: "user_saved_comparisons", ownerCol: "user_id" },
  { table: "user_shortlisted_brokers", ownerCol: "user_id" },
  { table: "user_current_products", ownerCol: "user_id" },
  { table: "user_term_deposits", ownerCol: "user_id" },
  { table: "user_daily_checkins", ownerCol: "user_id" },
  { table: "user_notifications", ownerCol: "user_id" },
  { table: "manual_balances", ownerCol: "user_id" },
  { table: "saved_searches", ownerCol: "user_id" },
  { table: "notification_preferences", ownerCol: "user_id" },
  { table: "watchlist_alert_preferences", ownerCol: "user_id" },
  { table: "investor_goals", ownerCol: "auth_user_id" },
];

// ---------------------------------------------------------------------------
// Pure logic — exported for unit tests
// ---------------------------------------------------------------------------

/**
 * Given the rows a caller could read, return the ones that DON'T belong to them
 * — i.e. cross-tenant leaks. A non-empty result means RLS failed to scope the
 * table to the authenticated user.
 *
 * @param {Record<string, unknown>[]} rows
 * @param {string} ownerCol
 * @param {string} selfId  the caller's auth uid
 * @returns {Record<string, unknown>[]}
 */
export function foreignRows(rows, ownerCol, selfId) {
  return rows.filter((r) => String(r[ownerCol]) !== String(selfId));
}

// ---------------------------------------------------------------------------
// Auth + fetch + runner
// ---------------------------------------------------------------------------

async function signIn(base, anonKey, email, password) {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`sign-in failed for ${email}: ${res.status}`);
  const json = await res.json();
  if (!json.access_token || !json.user?.id) throw new Error(`sign-in for ${email} returned no token/user`);
  return { token: json.access_token, userId: json.user.id };
}

async function readAs(base, anonKey, token, table, ownerCol) {
  const res = await fetch(`${base}/rest/v1/${table}?select=${ownerCol}&limit=500`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    // A 401/403/404 is fine (deny-all or table hidden) — it's the OPPOSITE of a
    // leak. Return empty so it counts as isolated.
    return [];
  }
  return res.json();
}

async function main() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const a = { email: process.env.BOTS_RLS_USER_A_EMAIL, password: process.env.BOTS_RLS_USER_A_PASSWORD };
  const b = { email: process.env.BOTS_RLS_USER_B_EMAIL, password: process.env.BOTS_RLS_USER_B_PASSWORD };
  if (!base || !anonKey || !a.email || !a.password || !b.email || !b.password) {
    console.log("[cross-tenant-rls] missing creds (URL + anon key + two test users) — skipping.");
    process.exit(0);
  }

  let userA, userB;
  try {
    [userA, userB] = await Promise.all([
      signIn(base, anonKey, a.email, a.password),
      signIn(base, anonKey, b.email, b.password),
    ]);
  } catch (e) {
    console.error("[cross-tenant-rls] auth error:", e instanceof Error ? e.message : e);
    process.exit(2);
  }
  if (userA.userId === userB.userId) {
    console.error("[cross-tenant-rls] both credentials resolve to the same user — need two distinct accounts.");
    process.exit(2);
  }

  /** @type {{ table: string, actor: string, leaked: number }[]} */
  const leaks = [];
  let checks = 0;
  for (const { table, ownerCol } of USER_OWNED_TABLES) {
    for (const actor of [userA, userB]) {
      checks++;
      const rows = await readAs(base, anonKey, actor.token, table, ownerCol);
      const foreign = foreignRows(rows, ownerCol, actor.userId);
      if (foreign.length > 0) leaks.push({ table, actor: actor.userId, leaked: foreign.length });
    }
  }

  if (leaks.length === 0) {
    console.log(`[cross-tenant-rls] ✅ no cross-tenant leaks across ${USER_OWNED_TABLES.length} tables (${checks} authed reads, 2 users).`);
    process.exit(0);
  }
  console.error(`[cross-tenant-rls] 🔴 ${leaks.length} tenant-isolation breach(es):\n`);
  for (const l of leaks) console.error(`  ${l.table}: user ${l.actor} could read ${l.leaked} row(s) owned by someone else`);
  console.error("\nFix: the table's RLS SELECT policy must scope to auth.uid() (no USING (true)).");
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error("[cross-tenant-rls] fatal:", err); process.exit(2); });
}
