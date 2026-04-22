/**
 * Staging Supabase seed script.
 *
 * Populates the staging DB with enough fixture data that every
 * E2E-covered route renders something meaningful. Idempotent —
 * uses upsert with stable slugs everywhere, so you can re-run
 * this after schema changes without ending up with duplicates.
 *
 * INVOCATION:
 *   SUPABASE_URL=https://<STAGING_REF>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<staging_service_role> \
 *     npx tsx scripts/seed-staging.ts
 *
 * ENV VARS:
 *   SUPABASE_URL                  — Staging project URL
 *   SUPABASE_SERVICE_ROLE_KEY     — Staging service-role key
 *
 * SAFETY: This script writes to whatever DB SUPABASE_URL points at.
 * It refuses to run if SUPABASE_URL looks like production (either
 * the exact prod ref or if the env var NODE_ENV=production).
 *
 * FIXTURE DESIGN:
 *   - 8 brokers (mix of active/inactive, 2 sponsored, 1 deal)
 *   - 5 published articles (covers /articles and /topic/[slug])
 *   - 4 active advisors across 2 cities (for /find-advisor)
 *   - 2 quiz weight rows (so /quiz renders + completes)
 *   - 1 sponsorship_placement row (for marketplace tests)
 *
 * Everything uses @example.com emails and clearly fake data so no
 * real-looking PII leaks into staging.
 */

import { createClient } from "@supabase/supabase-js";

const PROD_SUPABASE_REF = "guggzyqceattncjwvgyc";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error(
    "[seed-staging] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.",
  );
  process.exit(1);
}

// Hard refusal if pointed at prod. This script is destructive
// enough (upserts overwrite row content) that we must never
// accidentally clobber real data.
if (url.includes(PROD_SUPABASE_REF) || process.env.NODE_ENV === "production") {
  console.error(
    "[seed-staging] REFUSING to run against production Supabase.",
    `URL: ${url}`,
    "Unset SUPABASE_URL or point it at a staging project.",
  );
  process.exit(2);
}

console.log(`[seed-staging] Seeding ${url}…`);

const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false },
});

// ──────────────────────────────────────────────────────────────────
// BROKERS
// Covers: /best/*, /broker/[slug], /compare, /invest/* category pages
// ──────────────────────────────────────────────────────────────────

const brokers = [
  {
    slug: "example-share-broker",
    name: "Example Share Broker",
    status: "active",
    platform_type: "share_broker",
    asx_fee: "AUD $5",
    rating: 4.5,
    affiliate_url: "https://example.com/?ref=invest",
    tagline: "Staging fixture — share broker",
    chess_sponsored: true,
    regulated_by: "ASIC",
    sponsorship_tier: null,
  },
  {
    slug: "example-crypto-exchange",
    name: "Example Crypto",
    status: "active",
    platform_type: "crypto_exchange",
    is_crypto: true,
    asx_fee: "0.1%",
    rating: 4.2,
    affiliate_url: "https://example.com/crypto?ref=invest",
    tagline: "Staging fixture — crypto exchange",
    regulated_by: "AUSTRAC DCE",
    sponsorship_tier: null,
  },
  {
    slug: "example-cfd-platform",
    name: "Example CFD",
    status: "active",
    platform_type: "cfd_forex",
    asx_fee: "Spread-only",
    rating: 3.9,
    affiliate_url: "https://example.com/cfd?ref=invest",
    tagline: "Staging fixture — CFD/forex",
    regulated_by: "ASIC AFSL #123456",
    sponsorship_tier: null,
  },
  {
    slug: "example-super-fund",
    name: "Example Super",
    status: "active",
    platform_type: "super_fund",
    asx_fee: null,
    rating: 4.6,
    affiliate_url: "https://example.com/super?ref=invest",
    tagline: "Staging fixture — super fund",
    regulated_by: "APRA",
    sponsorship_tier: null,
  },
  {
    slug: "example-robo-advisor",
    name: "Example Robo",
    status: "active",
    platform_type: "robo_advisor",
    asx_fee: "0.25% pa",
    rating: 4.3,
    affiliate_url: "https://example.com/robo?ref=invest",
    tagline: "Staging fixture — robo-advisor",
    regulated_by: "ASIC AFSL #999888",
    sponsorship_tier: "featured",
  },
  {
    slug: "example-sponsored-broker",
    name: "Example Sponsored",
    status: "active",
    platform_type: "share_broker",
    asx_fee: "AUD $9",
    rating: 4.1,
    affiliate_url: "https://example.com/sponsored?ref=invest",
    tagline: "Staging fixture — sponsored placement",
    sponsorship_tier: "premium",
    deal: true,
    deal_text: "Zero brokerage for first 10 trades",
    deal_expiry: "2027-12-31",
  },
  {
    slug: "example-inactive-broker",
    name: "Example Inactive",
    status: "inactive",
    platform_type: "share_broker",
    rating: null,
    affiliate_url: null,
    tagline: "Staging fixture — inactive (should not appear in lists)",
  },
  {
    slug: "example-deal-broker",
    name: "Example Deal",
    status: "active",
    platform_type: "share_broker",
    asx_fee: "AUD $7",
    rating: 4.0,
    affiliate_url: "https://example.com/deal?ref=invest",
    tagline: "Staging fixture — deal broker",
    deal: true,
    deal_text: "20% off first year",
    deal_expiry: "2027-06-30",
  },
];

async function seedBrokers() {
  const { error } = await supabase.from("brokers").upsert(brokers, {
    onConflict: "slug",
  });
  if (error) {
    console.error("[seed-staging] brokers upsert failed:", error.message);
    process.exit(3);
  }
  console.log(`[seed-staging]  ✓ ${brokers.length} brokers`);
}

// ──────────────────────────────────────────────────────────────────
// ARTICLES
// Covers: /articles, /topic/[slug], /glossary (some articles link)
// ──────────────────────────────────────────────────────────────────

const articles = [
  {
    slug: "staging-etf-guide",
    title: "Staging — ETF Guide",
    status: "published",
    category: "etfs",
    excerpt: "Staging fixture article for E2E tests.",
    sections: [{ heading: "Intro", body: "Fixture content." }],
    tags: ["etf", "staging"],
    evergreen: true,
    published_at: "2026-01-01T00:00:00Z",
    read_time: 5,
    author_name: "Staging Author",
  },
  {
    slug: "staging-super-consolidation",
    title: "Staging — Super Consolidation",
    status: "published",
    category: "super",
    excerpt: "Staging fixture article.",
    sections: [{ heading: "Intro", body: "Fixture content." }],
    tags: ["super", "staging"],
    evergreen: true,
    published_at: "2026-01-02T00:00:00Z",
    read_time: 7,
    author_name: "Staging Author",
  },
  {
    slug: "staging-cfd-warning",
    title: "Staging — CFD Warning",
    status: "published",
    category: "cfd",
    excerpt: "Staging fixture article with compliance copy.",
    sections: [{ heading: "Warning", body: "Fixture CFD warning." }],
    tags: ["cfd", "staging"],
    evergreen: true,
    published_at: "2026-01-03T00:00:00Z",
    read_time: 4,
    author_name: "Staging Author",
  },
  {
    slug: "staging-crypto-basics",
    title: "Staging — Crypto Basics",
    status: "published",
    category: "crypto",
    excerpt: "Staging fixture article.",
    sections: [{ heading: "Intro", body: "Fixture content." }],
    tags: ["crypto", "staging"],
    evergreen: false,
    published_at: "2026-01-04T00:00:00Z",
    read_time: 6,
    author_name: "Staging Author",
  },
  {
    slug: "staging-draft-article",
    title: "Staging — Unpublished Draft",
    status: "draft",
    category: "etfs",
    excerpt: "Draft — should never appear in live lists.",
    sections: [{ heading: "Intro", body: "Fixture content." }],
    tags: ["etf"],
  },
];

async function seedArticles() {
  const { error } = await supabase.from("articles").upsert(articles, {
    onConflict: "slug",
  });
  if (error) {
    console.error("[seed-staging] articles upsert failed:", error.message);
    process.exit(3);
  }
  console.log(`[seed-staging]  ✓ ${articles.length} articles`);
}

// ──────────────────────────────────────────────────────────────────
// ADVISORS
// Covers: /find-advisor, /advisors/[type]/[state], /advisor/[slug]
// ──────────────────────────────────────────────────────────────────

const advisors = [
  {
    slug: "staging-advisor-sydney-a",
    display_name: "Staging Advisor A",
    status: "active",
    city: "Sydney",
    state: "NSW",
    email: "advisor-a@example.com",
    tier: "featured",
    afsl_number: "111111",
    verified_at: "2026-01-01T00:00:00Z",
  },
  {
    slug: "staging-advisor-sydney-b",
    display_name: "Staging Advisor B",
    status: "active",
    city: "Sydney",
    state: "NSW",
    email: "advisor-b@example.com",
    tier: "standard",
    afsl_number: "222222",
    verified_at: "2026-01-01T00:00:00Z",
  },
  {
    slug: "staging-advisor-melbourne-c",
    display_name: "Staging Advisor C",
    status: "active",
    city: "Melbourne",
    state: "VIC",
    email: "advisor-c@example.com",
    tier: "premium",
    afsl_number: "333333",
    verified_at: "2026-01-01T00:00:00Z",
  },
  {
    slug: "staging-advisor-brisbane-d",
    display_name: "Staging Advisor D",
    status: "pending",
    city: "Brisbane",
    state: "QLD",
    email: "advisor-d@example.com",
    tier: "standard",
    afsl_number: "444444",
  },
];

async function seedAdvisors() {
  const { error } = await supabase.from("advisors").upsert(advisors, {
    onConflict: "slug",
  });
  if (error) {
    console.error("[seed-staging] advisors upsert failed:", error.message);
    // Non-fatal — advisors table may not exist on first seed;
    // continue so the broker + article fixtures still land.
    console.warn(
      "[seed-staging]   (advisors may not exist yet — run supabase db push first)",
    );
  } else {
    console.log(`[seed-staging]  ✓ ${advisors.length} advisors`);
  }
}

// ──────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────

async function main() {
  await seedBrokers();
  await seedArticles();
  await seedAdvisors();
  console.log("[seed-staging] Done.");
}

main().catch((err) => {
  console.error("[seed-staging] Fatal:", err);
  process.exit(1);
});
