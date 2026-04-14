/**
 * Local dev seed script.
 *
 * Populates a bare-minimum dataset for local testing:
 *   - 5 active brokers
 *   - 3 published articles
 *   - 2 active advisors
 *   - 1 quiz weight row
 *   - a default admin row
 *
 * Not idempotent on primary keys — uses upsert semantics via
 * stable slugs where possible. Intended for Supabase local
 * (`supabase start` → 54322) OR a fresh staging branch.
 *
 * Usage:
 *
 *     # Requires SUPABASE_SERVICE_ROLE_KEY in .env.local for the
 *     # target project (local or staging)
 *     npx tsx scripts/seed-local.ts
 *
 * Adding new surface data: append an upsert below. Never hardcode
 * production-looking emails — prefer example.com addresses.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. Copy .env.local.example → .env.local and fill them in.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("Seeding local database…");

  // ── Brokers ────────────────────────────────────────────────
  const brokers = [
    {
      slug: "example-chess",
      name: "Example CHESS Broker",
      tagline: "CHESS-sponsored ASX broker — low brokerage",
      rating: 4.6,
      asx_fee: "$5 / trade",
      asx_fee_value: 500,
      chess_sponsored: true,
      status: "active",
      editors_pick: true,
    },
    {
      slug: "example-us",
      name: "Example US Broker",
      tagline: "US shares + ETFs at a low FX rate",
      rating: 4.3,
      us_fee: "0.01%",
      us_fee_value: 1,
      fx_rate: 0.5,
      status: "active",
    },
    {
      slug: "example-smsf",
      name: "Example SMSF Broker",
      tagline: "SMSF-friendly with corporate trustee support",
      rating: 4.1,
      smsf_support: true,
      status: "active",
    },
    {
      slug: "example-beginner",
      name: "Example Beginner Broker",
      tagline: "$0 brokerage on the first 10 trades",
      rating: 4.4,
      asx_fee: "$0",
      asx_fee_value: 0,
      status: "active",
    },
    {
      slug: "example-crypto",
      name: "Example Crypto Exchange",
      tagline: "AUSTRAC-registered Australian crypto exchange",
      rating: 4.2,
      is_crypto: true,
      status: "active",
    },
  ];

  for (const b of brokers) {
    const { error } = await supabase.from("brokers").upsert(b, { onConflict: "slug" });
    if (error) console.error("brokers upsert failed", b.slug, error.message);
  }
  console.log(`  ✓ ${brokers.length} brokers`);

  // ── Articles ──────────────────────────────────────────────
  const articles = [
    {
      slug: "how-to-choose-a-broker",
      title: "How to choose an Australian share broker in 2026",
      excerpt: "The practical guide — fees, CHESS, tax, tools.",
      category: "beginner",
      read_time: 8,
      status: "published",
      tags: ["beginner", "broker", "howto"],
    },
    {
      slug: "low-fee-brokers-2026",
      title: "Low-fee ASX brokers 2026",
      excerpt: "Ranked by effective fee for $1k, $10k, $100k trades.",
      category: "fees",
      read_time: 6,
      status: "published",
      tags: ["fees", "comparison"],
    },
    {
      slug: "cgt-basics",
      title: "Capital gains tax for investors",
      excerpt: "Discount, holding period, franking credits.",
      category: "tax",
      read_time: 12,
      status: "published",
      tags: ["tax", "cgt"],
    },
  ];
  for (const a of articles) {
    const { error } = await supabase.from("articles").upsert(a, { onConflict: "slug" });
    if (error) console.error("articles upsert failed", a.slug, error.message);
  }
  console.log(`  ✓ ${articles.length} articles`);

  // ── Professionals (advisors) ──────────────────────────────
  const advisors = [
    {
      slug: "example-advisor-sydney",
      name: "Alex Example",
      firm_name: "Example Advisory",
      email: "alex@example.com",
      type: "financial_advisor",
      location_state: "NSW",
      location_display: "Sydney",
      rating: 4.8,
      review_count: 12,
      verified: true,
      status: "active",
    },
    {
      slug: "example-advisor-melbourne",
      name: "Sam Example",
      firm_name: "Example Wealth",
      email: "sam@example.com",
      type: "financial_advisor",
      location_state: "VIC",
      location_display: "Melbourne",
      rating: 4.6,
      review_count: 8,
      verified: true,
      status: "active",
    },
  ];
  for (const a of advisors) {
    const { error } = await supabase.from("professionals").upsert(a, { onConflict: "slug" });
    if (error) console.error("professionals upsert failed", a.slug, error.message);
  }
  console.log(`  ✓ ${advisors.length} advisors`);

  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed", err);
  process.exit(1);
});
