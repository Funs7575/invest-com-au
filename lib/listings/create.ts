/**
 * Create a new draft listing for the owner-driven reverse flow.
 *
 * Generates a URL-safe slug from the title, retries once on slug
 * collision, and inserts a `draft` row owned by the supplied user.
 * Validation of the request body is the API layer's job — this helper
 * trusts its inputs (other than slug + status).
 */

// eslint-disable-next-line no-restricted-imports -- listings has no INSERT RLS policy for authenticated users (the table is service-role + anon-read + owner-update-draft only). Inserts of new listings must be done via service-role.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  rowToListing,
  type Listing,
  type ListingKind,
  type ListingRow,
} from "./types";

const log = logger("listings:create");

const MAX_SLUG_RETRIES = 2;

export interface CreateListingInput {
  ownerUserId: string | null;
  ownerEmail: string;
  title: string;
  kind: ListingKind;
  askingPriceCents?: number | null;
  currency?: string;
  locationState?: string | null;
  description?: string | null;
  payload?: Record<string, unknown>;
}

export interface CreateListingResult {
  ok: true;
  listing: Listing;
}

export interface CreateListingFailure {
  ok: false;
  error: string;
}

/** Best-effort URL-safe slug from a free-text title. */
export function slugifyTitle(title: string): string {
  const cleaned = title
    .toLowerCase()
    .normalize("NFKD")
    // Strip combining diacritical marks (U+0300..U+036F).
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned || "listing";
}

/** Append a short base36 timestamp tail so collisions are vanishingly rare. */
function slugWithTail(title: string): string {
  return `${slugifyTitle(title)}-${Date.now().toString(36)}`;
}

export async function createListing(
  input: CreateListingInput,
): Promise<CreateListingResult | CreateListingFailure> {
  const supabase = createAdminClient();

  const insertBase = {
    owner_user_id: input.ownerUserId,
    owner_email: input.ownerEmail.trim().toLowerCase(),
    title: input.title.trim(),
    kind: input.kind,
    asking_price_cents: input.askingPriceCents ?? null,
    currency: (input.currency || "AUD").toUpperCase(),
    location_state: input.locationState ?? null,
    description: input.description ?? null,
    payload: input.payload ?? {},
    status: "draft" as const,
  };

  // Retry slug-collision once. Two random tails colliding is rare enough
  // that 1 retry is plenty; anything more would mask a real bug.
  for (let attempt = 0; attempt <= MAX_SLUG_RETRIES; attempt++) {
    const slug = slugWithTail(input.title);
    const { data, error } = await supabase
      .from("listings")
      .insert({ ...insertBase, slug })
      .select("*")
      .single();

    if (!error && data) {
      return { ok: true, listing: rowToListing(data as ListingRow) };
    }

    // 23505 = unique_violation (Postgres). Retry the slug.
    if (error?.code === "23505" && attempt < MAX_SLUG_RETRIES) {
      log.warn("slug collision — retrying", { slug });
      continue;
    }

    log.error("createListing failed", {
      error: error?.message,
      code: error?.code,
    });
    return { ok: false, error: error?.message || "insert_failed" };
  }

  return { ok: false, error: "slug_collision_exhausted" };
}
