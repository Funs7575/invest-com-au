// Explicit PUBLIC column projection for the advisor profile page.
//
// The advisor profile page (`app/advisor/[slug]/page.tsx`) renders for ANONYMOUS
// visitors and passes the professionals row straight to the client component, so
// it must never `select('*')`. The professionals row also carries internal
// CRM/billing/scoring columns (stripe_customer_id, credit/lead balances,
// health_status, admin_notes/tags, profile_score, login_count,
// verification_failures, auto-pause reason, lead counts, etc.) that would
// otherwise leak into the serialized browser payload.
//
// Only the columns the profile UI actually renders are listed here. If the UI
// starts rendering a new field, add it here explicitly — do NOT switch back to
// `*`. Lives in its own module so the security invariant can be unit-tested
// without importing the full RSC render chain.
export const ADVISOR_PUBLIC_COLUMN_LIST = [
  "id",
  "slug",
  "name",
  "firm_name",
  "firm_id",
  "type",
  "account_type",
  "is_firm_admin",
  "specialties",
  "service_areas",
  "meeting_types",
  "ideal_client",
  "location_state",
  "location_suburb",
  "location_display",
  "afsl_number",
  "abn",
  "registration_number",
  "bio",
  "photo_url",
  "intro_video_url",
  "website",
  "phone",
  "linkedin_url",
  "twitter_url",
  "fee_structure",
  "fee_description",
  "hourly_rate_cents",
  "flat_fee_cents",
  "aum_percentage",
  "initial_consultation_free",
  "rating",
  "review_count",
  "verified",
  "verified_at",
  "verification_method",
  "qualifications",
  "education",
  "memberships",
  "languages",
  "years_experience",
  "faqs",
  "testimonials",
  "accepting_new_clients",
  "accepts_new_clients",
  "availability_status",
  "response_time_hours",
  "avg_response_minutes",
  "accepts_international_clients",
  "international_tax_specialist",
  "firb_specialist",
  "follower_count",
  "booking_link",
  "offer_text",
  "offer_terms",
  "offer_active",
  "meta_title",
  "meta_description",
  "created_at",
  "updated_at",
] as const;

/** Comma-joined column projection passed to Supabase `.select(...)`. */
export const ADVISOR_PUBLIC_COLUMNS = ADVISOR_PUBLIC_COLUMN_LIST.join(", ");
