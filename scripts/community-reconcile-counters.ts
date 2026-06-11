/**
 * Forum counter reconciliation + Ask-an-Advisor category seed.
 *
 * Why this exists: the forum seed migration (20260802000000) initialised
 * thread reply_count (0-7) and vote_score (4-16) ABOVE the rows it actually
 * inserted (1-2 replies, 0 votes) — displayed numbers the underlying data
 * can't back (same ACL s18 family as the fabricated social-proof counter
 * removed in PR #1489). This script recomputes every forum counter from
 * live rows, and idempotently creates the "Ask an Advisor" category that
 * the /community FAQ promises.
 *
 * DML only — no DDL, safe under the migration-ledger freeze
 * (docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md).
 *
 * Usage (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
 *   npx tsx --env-file=.env.local scripts/community-reconcile-counters.ts
 *
 * Idempotent — safe to re-run any time counters drift.
 */

import { createAdminClient } from "../lib/supabase/admin";
import { recountAllForumCounters } from "../lib/community/recount";

const ASK_AN_ADVISOR_CATEGORY = {
  slug: "ask-an-advisor",
  name: "Ask an Advisor",
  description:
    "Pose general questions for verified financial professionals to answer. General information only — not personal advice.",
  icon: "user-check",
  color: "#06b6d4",
  // Prod's forum_categories.status is a GENERATED column derived from
  // is_active — inserting status directly errors (verified 2026-06-10).
  is_active: true,
};

async function ensureAskAnAdvisorCategory(): Promise<"created" | "exists"> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("forum_categories")
    .select("id")
    .eq("slug", ASK_AN_ADVISOR_CATEGORY.slug)
    .maybeSingle();
  if (existing) return "exists";

  const { data: maxSort } = await admin
    .from("forum_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from("forum_categories").insert({
    ...ASK_AN_ADVISOR_CATEGORY,
    sort_order: (maxSort?.sort_order ?? 0) + 1,
    thread_count: 0,
    post_count: 0,
  });
  if (error) throw new Error(`ask-an-advisor insert failed: ${error.message}`);
  return "created";
}

async function main() {
  console.log("Reconciling forum counters from live rows…");
  const { categories, threads } = await recountAllForumCounters();
  console.log(`  ✓ recounted ${categories} categories, ${threads} threads`);

  const categoryResult = await ensureAskAnAdvisorCategory();
  console.log(
    categoryResult === "created"
      ? "  ✓ created 'Ask an Advisor' category"
      : "  ✓ 'Ask an Advisor' category already exists",
  );

  console.log("Done.");
}

main().catch((err) => {
  console.error("Reconciliation failed:", err);
  process.exit(1);
});
