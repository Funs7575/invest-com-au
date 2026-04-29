#!/usr/bin/env node
/**
 * scripts/backfill-cover-images.mjs
 *
 * Idempotent backfill for `articles.cover_image_url` (queue item M-01b).
 *
 * Why this exists
 * ───────────────
 * M-01a (PR #227) shipped a site-wide default OpenGraph card so every
 * route without a per-page override gets a branded fallback image.
 * M-01b is the per-article custom-cover work that historically lifts
 * social-share CTR ~30–50% over the generic default. We don't have a
 * cover photo per article in the DB yet — `articles.cover_image_url`
 * is null for the ~266 published articles. This script walks them and
 * populates the column from a deterministic mapping so:
 *
 *   1. The detail page (`app/article/[slug]/page.tsx`) shows a real
 *      hero image instead of the gradient placeholder.
 *   2. `generateMetadata` (same file) emits the cover as the
 *      `og:image` / `twitter:image` for that article.
 *
 * The page-side wiring already prefers `cover_image_url` if present
 * and degrades to the dynamic `/api/og` fallback when null — landed
 * in the same PR as this script.
 *
 * Mapping strategy
 * ────────────────
 * The script accepts a JSON manifest at `scripts/cover-images.json`
 * that maps `slug → image URL`. Format:
 *
 *   {
 *     "best-asx-brokers": "https://cdn.invest.com.au/articles/asx-brokers.webp",
 *     "first-home-buyer-fhss": "https://cdn.invest.com.au/articles/fhss.webp"
 *   }
 *
 * The founder maintains the manifest (it's a content decision, not an
 * engineering one). Articles missing from the manifest are skipped —
 * they keep using the M-01a default OG and the gradient placeholder
 * `<ArticleCover>` until a cover is sourced.
 *
 * If the manifest is absent, the script category-buckets unmatched
 * slugs and uses `category` → fallback URL from `--default-by-category`
 * (also a JSON file). This lets us backfill in batches: ship category
 * defaults first (one image per category), then refine per-article
 * over time.
 *
 * Idempotency
 * ───────────
 *  - Reads `cover_image_url` for every published article first.
 *  - Skips rows where the column is already populated UNLESS
 *    `--overwrite` is passed.
 *  - Writes only the diffs (one update per row that needs it).
 *  - Safe to re-run any number of times — repeated runs after a clean
 *    backfill produce zero writes.
 *
 * Dry-run by default
 * ──────────────────
 * The script prints the plan (slug → cover URL) and EXITS without
 * touching the DB unless `--apply` is passed. The founder runs this
 * against prod with `--apply`; the loop never does.
 *
 * Usage
 * ─────
 *   # Plan only (default — no DB writes):
 *   node scripts/backfill-cover-images.mjs
 *
 *   # Plan with a custom manifest:
 *   node scripts/backfill-cover-images.mjs --manifest=scripts/cover-images.json
 *
 *   # Apply against prod (requires SUPABASE_SERVICE_ROLE_KEY in env):
 *   node scripts/backfill-cover-images.mjs --apply
 *
 *   # Force re-write existing covers (rare):
 *   node scripts/backfill-cover-images.mjs --apply --overwrite
 *
 * Required env
 * ────────────
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (service role — bypasses RLS)
 *
 * Runbook: docs/runbooks/article-cover-image-backfill.md
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ── arg parsing ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const OVERWRITE = args.includes('--overwrite');
const manifestArg = args.find((a) => a.startsWith('--manifest='));
const defaultsArg = args.find((a) => a.startsWith('--default-by-category='));

const MANIFEST_PATH = resolve(
  manifestArg ? manifestArg.split('=')[1] : 'scripts/cover-images.json',
);
const DEFAULTS_PATH = resolve(
  defaultsArg
    ? defaultsArg.split('=')[1]
    : 'scripts/cover-images.defaults.json',
);

// ── env ─────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.',
  );
  process.exit(1);
}

// ── load mapping inputs ─────────────────────────────────────────────
function loadJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse ${path}:`, err.message);
    process.exit(1);
  }
}

const manifest = loadJson(MANIFEST_PATH) || {};
const defaultsByCategory = loadJson(DEFAULTS_PATH) || {};

const manifestCount = Object.keys(manifest).length;
const defaultsCount = Object.keys(defaultsByCategory).length;

if (manifestCount === 0 && defaultsCount === 0) {
  console.warn(
    `No mapping inputs found.\n` +
      `  Looked for manifest at:        ${MANIFEST_PATH}\n` +
      `  Looked for category defaults:  ${DEFAULTS_PATH}\n` +
      `Either file should be a JSON object. See script header for format.`,
  );
  process.exit(1);
}

console.log(
  `Loaded ${manifestCount} per-slug mappings + ${defaultsCount} category defaults.`,
);

// ── fetch articles ──────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

console.log('Fetching published articles…');
const { data: articles, error: fetchErr } = await supabase
  .from('articles')
  .select('id, slug, category, cover_image_url')
  .eq('status', 'published')
  .order('id', { ascending: true });

if (fetchErr) {
  console.error('Fetch failed:', fetchErr.message);
  process.exit(1);
}

if (!articles || articles.length === 0) {
  console.log('No published articles found. Nothing to do.');
  process.exit(0);
}

console.log(`Fetched ${articles.length} published articles.`);

// ── plan ────────────────────────────────────────────────────────────
const plan = []; // { id, slug, current, next, source }
const skipped = []; // { slug, reason }

for (const a of articles) {
  const current = a.cover_image_url || null;
  // resolve target: per-slug manifest wins, then category default
  let next = null;
  let source = '';
  if (manifest[a.slug]) {
    next = manifest[a.slug];
    source = 'manifest';
  } else if (a.category && defaultsByCategory[a.category]) {
    next = defaultsByCategory[a.category];
    source = `category:${a.category}`;
  }

  if (!next) {
    skipped.push({ slug: a.slug, reason: 'no mapping' });
    continue;
  }

  if (current && !OVERWRITE) {
    skipped.push({ slug: a.slug, reason: 'already populated' });
    continue;
  }

  if (current === next) {
    skipped.push({ slug: a.slug, reason: 'unchanged' });
    continue;
  }

  plan.push({ id: a.id, slug: a.slug, current, next, source });
}

// ── report ──────────────────────────────────────────────────────────
console.log('');
console.log('Plan:');
console.log(`  Total published: ${articles.length}`);
console.log(`  To update:       ${plan.length}`);
console.log(`  Skipped:         ${skipped.length}`);
console.log('');

if (plan.length > 0) {
  const sample = plan.slice(0, 10);
  console.log('Sample updates (up to 10):');
  for (const p of sample) {
    console.log(
      `  ${p.slug.padEnd(40)} ${p.current ? '[overwrite]' : '[fill]'} → ${p.next}  (${p.source})`,
    );
  }
  if (plan.length > sample.length) {
    console.log(`  …and ${plan.length - sample.length} more`);
  }
}

const skipReasons = skipped.reduce((acc, s) => {
  acc[s.reason] = (acc[s.reason] || 0) + 1;
  return acc;
}, {});
if (Object.keys(skipReasons).length > 0) {
  console.log('');
  console.log('Skip reasons:');
  for (const [reason, count] of Object.entries(skipReasons)) {
    console.log(`  ${reason.padEnd(20)} ${count}`);
  }
}

if (!APPLY) {
  console.log('');
  console.log(
    'Dry-run only — re-run with --apply to write these updates to the DB.',
  );
  process.exit(0);
}

if (plan.length === 0) {
  console.log('');
  console.log('Nothing to apply.');
  process.exit(0);
}

// ── apply ───────────────────────────────────────────────────────────
console.log('');
console.log(`Applying ${plan.length} updates…`);
let ok = 0;
let fail = 0;

for (const p of plan) {
  const { error } = await supabase
    .from('articles')
    .update({ cover_image_url: p.next })
    .eq('id', p.id);
  if (error) {
    fail += 1;
    console.error(`  FAIL ${p.slug}: ${error.message}`);
  } else {
    ok += 1;
    if (ok % 25 === 0) {
      console.log(`  …${ok} updated`);
    }
  }
}

console.log('');
console.log(`Done. updated=${ok} failed=${fail}`);
process.exit(fail > 0 ? 1 : 0);
