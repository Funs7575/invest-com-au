import { describe, it, expect } from "vitest";
import {
  ADVISOR_PUBLIC_COLUMN_LIST,
  ADVISOR_PUBLIC_COLUMNS,
} from "@/app/advisor/[slug]/public-columns";

// Regression guard for the advisor-profile data-exposure fix.
//
// `app/advisor/[slug]/page.tsx` used to `select('*')` and hand the whole
// professionals row to the anonymous client component, leaking internal
// CRM/billing/scoring columns into the serialized browser payload. The page now
// projects an explicit allow-list; these tests pin that allow-list so the leak
// can never silently come back.

// Columns that must NEVER reach an anonymous visitor. Internal CRM, Stripe /
// billing, lead economics, admin notes, scoring, and operational SLA internals.
const FORBIDDEN_INTERNAL_COLUMNS = [
  // Stripe / billing
  "stripe_customer_id",
  "stripe_connect_account_id",
  "credit_balance_cents",
  "lifetime_credit_cents",
  "lifetime_lead_spend_cents",
  "free_leads_used",
  "lead_price_cents",
  // Lead economics / CRM
  "total_leads",
  "total_leads_received",
  "leads_this_month",
  "last_lead_at",
  "unresponded_leads",
  // Admin / moderation
  "admin_notes",
  "admin_tags",
  "health_status",
  "health_score",
  "tier_change_reason",
  "alert_preferences",
  // Scoring internals
  "profile_score",
  "profile_quality_gate",
  "profile_gate_checked_at",
  "profile_missing_fields",
  // Auth / session internals
  "last_login_at",
  "login_count",
  // Verification internals (the public method label is allowed; the rest is not)
  "verified_by",
  "verification_failures",
  "verification_notes",
  "last_verified_at",
  // Operational pause internals
  "auto_paused_at",
  "auto_pause_reason",
  "pause_warning_sent_at",
];

describe("advisor profile public column projection", () => {
  it("is an explicit allow-list, never a wildcard select", () => {
    expect(ADVISOR_PUBLIC_COLUMNS).not.toContain("*");
    expect(ADVISOR_PUBLIC_COLUMN_LIST.length).toBeGreaterThan(0);
  });

  it("excludes every internal / stripe / scoring column", () => {
    const projected = new Set<string>(ADVISOR_PUBLIC_COLUMN_LIST);
    const leaked = FORBIDDEN_INTERNAL_COLUMNS.filter((col) => projected.has(col));
    expect(leaked).toEqual([]);
  });

  it("does not name any internal column inside the joined select string", () => {
    // Defends against a forbidden column sneaking in via a comma-joined alias.
    const columns = ADVISOR_PUBLIC_COLUMNS.split(",").map((c) => c.trim());
    for (const forbidden of FORBIDDEN_INTERNAL_COLUMNS) {
      expect(columns).not.toContain(forbidden);
    }
  });

  it("still includes the public fields the profile UI renders", () => {
    const projected = new Set<string>(ADVISOR_PUBLIC_COLUMN_LIST);
    const requiredPublic = [
      "id",
      "slug",
      "name",
      "firm_name",
      "type",
      "bio",
      "photo_url",
      "specialties",
      "rating",
      "review_count",
      "verified",
      "afsl_number",
      "qualifications",
      "languages",
      "fee_description",
      "verification_method",
      "account_type",
    ];
    const missing = requiredPublic.filter((col) => !projected.has(col));
    expect(missing).toEqual([]);
  });
});
