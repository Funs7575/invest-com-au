#!/usr/bin/env node
/**
 * E-E-A-T coverage audit for the `articles` table.
 *
 * Google's E-E-A-T (Experience / Expertise / Authoritativeness /
 * Trust) signals matter most for YMYL content — and every page on an
 * AU investing site qualifies. This script connects to Supabase via
 * the service-role key and audits every published article for the
 * three minimum E-E-A-T fields the schema already supports:
 *
 *   - author_name (or author_id): "who wrote this?"
 *   - published_at: "when was this published?"
 *   - last_reviewed_at: "when was this last fact-checked?"
 *
 * For each missing field, prints the article slug + the missing
 * field name. Soft check today; promote to hard once coverage hits
 * 100% by editorial backfill.
 *
 * Run: SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... node scripts/check-eeat-coverage.mjs
 *
 * Exits 0 always — this is a reporting tool, not a CI gate (no env
 * vars in CI without the secret).
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("E-E-A-T coverage audit — SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL must be set; skipping.");
  process.exit(0);
}

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, author_name, author_id, published_at, last_reviewed_at, status")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(2000);

  if (error) {
    console.error(`Query failed: ${error.message}`);
    process.exit(0);
  }

  const articles = data ?? [];
  const total = articles.length;
  const missing = {
    author: [],
    published: [],
    reviewed: [],
  };

  for (const article of articles) {
    const hasAuthor =
      (article.author_name && article.author_name.length > 0) ||
      article.author_id != null;
    if (!hasAuthor) missing.author.push(article.slug);
    if (!article.published_at) missing.published.push(article.slug);
    if (!article.last_reviewed_at) missing.reviewed.push(article.slug);
  }

  const authorPct = total > 0 ? ((total - missing.author.length) / total) * 100 : 0;
  const publishedPct = total > 0 ? ((total - missing.published.length) / total) * 100 : 0;
  const reviewedPct = total > 0 ? ((total - missing.reviewed.length) / total) * 100 : 0;

  console.log(
    `E-E-A-T coverage audit — ${total} published article(s) scanned`,
  );
  console.log("");
  console.log(`  author        ${authorPct.toFixed(1)}% covered  (${total - missing.author.length}/${total})`);
  console.log(`  published_at  ${publishedPct.toFixed(1)}% covered  (${total - missing.published.length}/${total})`);
  console.log(`  last_reviewed ${reviewedPct.toFixed(1)}% covered  (${total - missing.reviewed.length}/${total})`);

  function previewList(label, slugs) {
    if (slugs.length === 0) return;
    console.log(`\n  ⚠  Missing ${label}: ${slugs.length} article(s)`);
    for (const s of slugs.slice(0, 10)) {
      console.log(`     - ${s}`);
    }
    if (slugs.length > 10) console.log(`     …and ${slugs.length - 10} more`);
  }

  previewList("author", missing.author);
  previewList("published_at", missing.published);
  previewList("last_reviewed_at", missing.reviewed);

  if (missing.author.length + missing.published.length + missing.reviewed.length === 0) {
    console.log("\n✓ Every published article has author, published_at, and last_reviewed_at.");
  } else {
    console.log(
      "\nFix options:\n" +
        "  1. Backfill in bulk via /admin/articles editor (set author_id from team_members,\n" +
        "     stamp last_reviewed_at = now for content reviewed in the last quarter).\n" +
        "  2. For published_at gaps, take created_at as the publication date if no real\n" +
        "     date is available.\n" +
        "  3. Once coverage is 100%, promote this script to a hard CI gate against published-\n" +
        "     article inserts via a Supabase trigger.\n",
    );
  }
}

await main();
process.exit(0);
