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

  // ── Wave 10/11 compliance tables ──────────────────────────
  //
  // Seeding these makes the admin surfaces render a real
  // dataset locally instead of an empty state, so reviewers
  // can actually click through the moderation queue, TMD
  // dashboard and financial-periods page during dev.

  // TMDs — one per broker so the DDO audit cron comes back clean
  const brokerSlugs = ["stake", "cmc-markets", "selfwealth", "interactive-brokers", "pearler"];
  for (const slug of brokerSlugs) {
    const { error } = await supabase.from("tmds").upsert(
      {
        product_type: "broker",
        product_ref: slug,
        product_name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        tmd_url: `https://example.com/tmds/${slug}-v1.pdf`,
        tmd_version: "v1",
        reviewed_at: new Date().toISOString(),
        valid_from: new Date().toISOString(),
        valid_until: null,
      },
      { onConflict: "product_type,product_ref,tmd_version" },
    );
    if (error) console.error("tmds upsert failed", slug, error.message);
  }
  console.log(`  ✓ ${brokerSlugs.length} TMDs`);

  // Complaints register — one in-SLA + one overdue so the
  // admin complaints page shows both states.
  const now = new Date();
  const complaints = [
    {
      reference_id: "CMPL-0001",
      complainant_email: "sample.complainant@example.com",
      complainant_name: "Sample Complainant",
      subject: "Delayed fee credit",
      body: "The sign-up credit wasn't applied to my account.",
      category: "lead_billing",
      severity: "standard",
      status: "submitted",
      submitted_at: now.toISOString(),
      sla_due_at: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
    },
    {
      reference_id: "CMPL-0002",
      complainant_email: "sample2@example.com",
      complainant_name: "Sample Two",
      subject: "Advisor response time",
      body: "Haven't heard back from my matched advisor in 10 days.",
      category: "advisor_conduct",
      severity: "high",
      status: "under_review",
      submitted_at: new Date(now.getTime() - 28 * 86_400_000).toISOString(),
      sla_due_at: new Date(now.getTime() + 2 * 86_400_000).toISOString(),
    },
  ];
  for (const c of complaints) {
    const { error } = await supabase
      .from("complaints_register")
      .upsert(c, { onConflict: "reference_id" });
    if (error) console.error("complaints_register upsert failed", c.reference_id, error.message);
  }
  console.log(`  ✓ ${complaints.length} complaints`);

  // Financial periods — seed the previous + current month so the
  // admin page renders a meaningful table.
  const thisMonthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const thisMonthEnd = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0);
  const lastMonthStart = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getUTCFullYear(), now.getUTCMonth(), 0);
  const toDate = (d: Date) => d.toISOString().slice(0, 10);
  const periods = [
    {
      period_start: toDate(lastMonthStart),
      period_end: toDate(lastMonthEnd),
      status: "closed",
      closed_at: now.toISOString(),
      closed_by: "seed:local",
      audit_row_count: 0,
      total_credits_cents: 0,
      total_refunds_cents: 0,
      notes: "Seeded by scripts/seed-local.ts",
    },
    {
      period_start: toDate(thisMonthStart),
      period_end: toDate(thisMonthEnd),
      status: "open",
      notes: "Current month — managed by month-end-close cron",
    },
  ];
  for (const p of periods) {
    const { error } = await supabase
      .from("financial_periods")
      .upsert(p, { onConflict: "period_start,period_end" });
    if (error) console.error("financial_periods upsert failed", p.period_start, error.message);
  }
  console.log(`  ✓ ${periods.length} financial periods`);

  // ── Wave 11 user-account demo rows ──────────────────────
  // These all key off auth.users ids, which we don't create
  // from the seed (auth.admin.createUser would leak real
  // email to Inbucket). Instead, seed a single system
  // notification tied to the admin user if they exist.
  try {
    const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 10 });
    const adminUser = (userList?.users || []).find((u) => u.email === "admin@invest.com.au");
    if (adminUser) {
      await supabase.from("user_notifications").upsert(
        [
          {
            user_id: adminUser.id,
            type: "system",
            title: "Welcome to Invest.com.au",
            body: "This seed notification was dropped by scripts/seed-local.ts.",
            link_url: "/account",
            email_delivery_key: "seed:welcome",
          },
          {
            user_id: adminUser.id,
            type: "fee_change",
            title: "Stake cut their US brokerage fee",
            body: "Stake dropped US brokerage from US$3 to US$2. Worth a look.",
            link_url: "/broker/stake",
            email_delivery_key: "seed:fee_change:stake",
          },
        ],
        { onConflict: "user_id,email_delivery_key" as never },
      );
      console.log("  ✓ 2 seeded notifications for admin user");
    } else {
      console.log("  · skipped user_notifications (no admin user in auth.users)");
    }
  } catch (err) {
    console.log(
      "  · skipped user_notifications (auth.admin unavailable):",
      err instanceof Error ? err.message : String(err),
    );
  }

  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed", err);
  process.exit(1);
});
