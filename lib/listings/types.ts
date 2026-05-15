/**
 * Type definitions for the owner-driven `listings` table (reverse-flow
 * primitive introduced by migration 20260514_mm12_listings.sql).
 *
 * Distinct from `investment_listings` (the legacy paid catalog) — these
 * rows represent owner-submitted opportunities that go through
 * admin moderation before becoming discoverable.
 */

export type ListingKind = "property" | "business" | "syndicate" | "asset_other";

export type ListingStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "archived";

export interface Listing {
  id: string;
  slug: string;
  ownerUserId: string | null;
  ownerEmail: string;
  title: string;
  kind: ListingKind;
  askingPriceCents: number | null;
  currency: string;
  locationState: string | null;
  description: string | null;
  payload: Record<string, unknown>;
  status: ListingStatus;
  moderationNotes: string | null;
  viewCount: number;
  matchRequestCount: number;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
}

export const LISTING_KINDS: ListingKind[] = [
  "property",
  "business",
  "syndicate",
  "asset_other",
];

export const LISTING_STATUSES: ListingStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "archived",
];

export const LISTING_KIND_LABELS: Record<ListingKind, string> = {
  property: "Property",
  business: "Business",
  syndicate: "Syndicate / fund",
  asset_other: "Other asset",
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
};

/** Raw row shape returned by Supabase (snake_case). */
export interface ListingRow {
  id: string;
  slug: string;
  owner_user_id: string | null;
  owner_email: string;
  title: string;
  kind: ListingKind;
  asking_price_cents: number | null;
  currency: string;
  location_state: string | null;
  description: string | null;
  payload: Record<string, unknown> | null;
  status: ListingStatus;
  moderation_notes: string | null;
  view_count: number;
  match_request_count: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

/** Map a raw DB row to the camelCase domain type. */
export function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    slug: row.slug,
    ownerUserId: row.owner_user_id,
    ownerEmail: row.owner_email,
    title: row.title,
    kind: row.kind,
    askingPriceCents: row.asking_price_cents,
    currency: row.currency,
    locationState: row.location_state,
    description: row.description,
    payload: row.payload ?? {},
    status: row.status,
    moderationNotes: row.moderation_notes,
    viewCount: row.view_count,
    matchRequestCount: row.match_request_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
  };
}

export function isListingKind(value: unknown): value is ListingKind {
  return typeof value === "string" && (LISTING_KINDS as readonly string[]).includes(value);
}

export function isListingStatus(value: unknown): value is ListingStatus {
  return (
    typeof value === "string" && (LISTING_STATUSES as readonly string[]).includes(value)
  );
}
