/**
 * One-time migration script: reads the existing TS content arrays and
 * outputs SQL INSERT statements for the Supabase `versus_editorials`
 * and `advisor_guide_content` tables.
 *
 * Usage:
 *   npx tsx scripts/seed-content.ts > supabase/seed-content.sql
 *   # Then run the SQL against your Supabase project
 */

// We import directly from the legacy files that still export the data.
import { getAllVersusEditorialKeys, getVersusEditorial } from "../lib/versus-content";
import { ADVISOR_GUIDES } from "../lib/advisor-guides";

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function jsonLiteral(val: unknown): string {
  return `'${escapeSQL(JSON.stringify(val))}'::jsonb`;
}

function sqlStringOrNull(val: string | undefined | null): string {
  if (val == null || val === "") return "NULL";
  return `'${escapeSQL(val)}'`;
}

// ── Versus Editorials ────────────────────────────────────────────────

console.log("-- ══════════════════════════════════════════════════════════");
console.log("-- Versus Editorials");
console.log("-- ══════════════════════════════════════════════════════════");
console.log("");

const versusKeys = getAllVersusEditorialKeys();

for (const key of versusKeys) {
  // key is already sorted slugs joined by "-vs-"
  const parts = key.split("-vs-");
  // The key format can be multi-word slugs like "cmc-markets-vs-commsec"
  // We need to split on "-vs-" which is what the source does
  // Actually the key was formed by sorting slugs and joining with "-vs-"
  // so we can trust the split
  const brokerASlugs: string[] = [];
  const brokerBSlugs: string[] = [];

  // Parse the key back into two broker slugs
  // The key is sorted(slug_a, slug_b).join("-vs-")
  // But slugs themselves can contain hyphens, so we need getVersusEditorial
  const editorial = getVersusEditorial(parts);
  if (!editorial) continue;

  // Since the key is "sorted-slug-a-vs-sorted-slug-b" we need to
  // figure out the two broker slugs. The original data has `key` field.
  // Let's parse by finding "-vs-" in the key string.
  const vsIndex = key.indexOf("-vs-");
  const brokerA = key.substring(0, vsIndex);
  const brokerB = key.substring(vsIndex + 4);

  const slug = key; // The key IS the slug
  const title = `${brokerA} vs ${brokerB}`; // Will be overridden by display logic

  const faqs = editorial.faqs
    ? editorial.faqs.map((f) => ({ question: f.question, answer: f.answer }))
    : [];

  console.log(`INSERT INTO versus_editorials (slug, broker_a_slug, broker_b_slug, title, intro, choose_a, choose_b, sections, faqs)`);
  console.log(`VALUES (`);
  console.log(`  ${sqlStringOrNull(slug)},`);
  console.log(`  ${sqlStringOrNull(brokerA)},`);
  console.log(`  ${sqlStringOrNull(brokerB)},`);
  console.log(`  ${sqlStringOrNull(title)},`);
  console.log(`  ${sqlStringOrNull(editorial.tldr)},`);
  console.log(`  ${sqlStringOrNull(editorial.chooseA)},`);
  console.log(`  ${sqlStringOrNull(editorial.chooseB)},`);
  console.log(`  ${jsonLiteral(editorial.sections)},`);
  console.log(`  ${jsonLiteral(faqs)}`);
  console.log(`) ON CONFLICT (slug) DO UPDATE SET`);
  console.log(`  intro = EXCLUDED.intro,`);
  console.log(`  choose_a = EXCLUDED.choose_a,`);
  console.log(`  choose_b = EXCLUDED.choose_b,`);
  console.log(`  sections = EXCLUDED.sections,`);
  console.log(`  faqs = EXCLUDED.faqs,`);
  console.log(`  updated_at = now();`);
  console.log("");
}

// ── Advisor Guides ───────────────────────────────────────────────────

console.log("-- ══════════════════════════════════════════════════════════");
console.log("-- Advisor Guide Content");
console.log("-- ══════════════════════════════════════════════════════════");
console.log("");

for (const guide of ADVISOR_GUIDES) {
  // Normalise faqs from {q, a} to {question, answer} for the DB
  const faqs = guide.faqs.map((f) => ({ question: f.q, answer: f.a }));

  console.log(`INSERT INTO advisor_guide_content (slug, advisor_type, title, meta_description, intro, sections, checklist, red_flags, faqs)`);
  console.log(`VALUES (`);
  console.log(`  ${sqlStringOrNull(guide.slug)},`);
  console.log(`  ${sqlStringOrNull(guide.type)},`);
  console.log(`  ${sqlStringOrNull(guide.title)},`);
  console.log(`  ${sqlStringOrNull(guide.metaDescription)},`);
  console.log(`  ${sqlStringOrNull(guide.intro)},`);
  console.log(`  ${jsonLiteral(guide.sections)},`);
  console.log(`  ${jsonLiteral(guide.checklist)},`);
  console.log(`  ${jsonLiteral(guide.redFlags)},`);
  console.log(`  ${jsonLiteral(faqs)}`);
  console.log(`) ON CONFLICT (slug) DO UPDATE SET`);
  console.log(`  advisor_type = EXCLUDED.advisor_type,`);
  console.log(`  title = EXCLUDED.title,`);
  console.log(`  meta_description = EXCLUDED.meta_description,`);
  console.log(`  intro = EXCLUDED.intro,`);
  console.log(`  sections = EXCLUDED.sections,`);
  console.log(`  checklist = EXCLUDED.checklist,`);
  console.log(`  red_flags = EXCLUDED.red_flags,`);
  console.log(`  faqs = EXCLUDED.faqs,`);
  console.log(`  updated_at = now();`);
  console.log("");
}

console.log("-- Done. Total versus editorials:", versusKeys.length);
console.log("-- Total advisor guides:", ADVISOR_GUIDES.length);
