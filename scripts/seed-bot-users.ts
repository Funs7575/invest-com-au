/**
 * Bot-fleet test-account seed.
 *
 * Idempotently provisions the dedicated authenticated account(s) the bot fleet
 * uses to exercise LOGGED-IN journeys (account dashboard, holdings, save-a-plan,
 * advisor enquiry) against a disposable sandbox / staging target. Money,
 * affiliate and external paths are auto-mocked by the fleet
 * (`bots/safety/money-paths.ts`) — these accounts have zero financial side
 * effects.
 *
 * What it does, per account:
 *   1. `auth.admin.createUser({ email, password, email_confirm: true })`,
 *      tolerating "already registered" so re-runs are safe.
 *   2. upserts the matching `public.profiles` row (keyed on auth.users.id) so
 *      the account area renders instead of showing an empty/broken state.
 *
 * Credentials reuse the existing test convention — the non-routable
 * `*.invest-test.local` domain and the shared `TEST_USER_PASSWORD` from
 * e2e/visual/state-registry.ts (single source of truth) — so the Playwright
 * auto-login flow can sign these accounts in unchanged. No new secret is
 * introduced and no secret is ever printed.
 *
 * Usage:
 *
 *     # Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env for
 *     # the target project (Supabase local or a throwaway staging branch).
 *     npm run bots:seed-users
 *     # or: npx tsx scripts/seed-bot-users.ts
 *
 * NEVER point this at production — it writes to auth.users.
 */

import { createClient } from "@supabase/supabase-js";
import { TEST_USER_PASSWORD } from "../e2e/visual/state-registry";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. " +
      "Copy .env.local.example → .env.local and fill them in for the SANDBOX/STAGING " +
      "target (never production).",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * The dedicated bot accounts. Mirror the `*.invest-test.local` convention used
 * by e2e/visual/auto-login.spec.ts and the `bot-buyer` auth state in
 * state-registry.ts. At minimum we ship one individual investor.
 */
export interface BotSeedUser {
  email: string;
  displayName: string;
}

export const BOT_SEED_USERS: BotSeedUser[] = [
  {
    email: "test-bot-buyer@invest-test.local",
    displayName: "Bot Buyer (test individual)",
  },
];

/** Treat Supabase's "already registered" responses as success (idempotency). */
function isAlreadyRegistered(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("already exists") ||
    m.includes("duplicate")
  );
}

/**
 * Resolve a user's id by email — used when createUser reports the account
 * already exists, so we can still upsert its profile row.
 */
async function findUserIdByEmail(email: string): Promise<string | null> {
  // listUsers is paginated; the test project is tiny, but page through to be safe.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = (data?.users ?? []).find((u) => u.email === email);
    if (match) return match.id;
    if (!data || data.users.length < 200) break;
  }
  return null;
}

async function seedUser(user: BotSeedUser): Promise<{ email: string; status: string }> {
  let userId: string | null = null;
  let status: string;

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    if (!isAlreadyRegistered(error.message)) {
      throw new Error(`createUser(${user.email}) failed: ${error.message}`);
    }
    userId = await findUserIdByEmail(user.email);
    status = "exists";
  } else {
    userId = data.user?.id ?? null;
    status = "created";
  }

  if (!userId) {
    return { email: user.email, status: `${status} (no id — profile skipped)` };
  }

  // Mirror the individual-user profile row the account area expects.
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: user.email,
      display_name: user.displayName,
    },
    { onConflict: "id" },
  );
  if (profileError) {
    return { email: user.email, status: `${status} (profile upsert failed: ${profileError.message})` };
  }

  return { email: user.email, status: `${status} + profile` };
}

async function main() {
  console.log("Seeding bot test account(s)…");
  console.log(`  target: ${url}`);

  const results: Array<{ email: string; status: string }> = [];
  for (const user of BOT_SEED_USERS) {
    results.push(await seedUser(user));
  }

  console.log("\nSummary:");
  for (const r of results) {
    console.log(`  ✓ ${r.email} — ${r.status}`);
  }
  console.log(
    "\nNext: capture auth via `npm run screenshots:auto-login`, then run " +
      "`npm run bots:sandbox`. (Password is the shared test credential — not printed.)",
  );
  console.log("Done.");
}

main().catch((err) => {
  console.error("Bot-user seed failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
