/**
 * POST /api/listings/owner-flow
 *
 * Create a draft listing in the owner-driven reverse-flow primitive.
 * The owner is identified by their Supabase auth session — anonymous
 * submissions are rejected because the listing row is owner-scoped via
 * RLS. The route returns the inserted listing id + slug so the wizard
 * can redirect to step 2 / 3 or to the tracker.
 *
 * Rate-limited per-IP via the DB token bucket. Body is Zod-validated
 * through `withValidatedBody` so the handler only ever sees a typed body.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { createListing } from "@/lib/listings/create";
import { LISTING_KINDS } from "@/lib/listings/types";

const log = logger("listings:owner-flow:create");

export const runtime = "nodejs";

const CreateListingBody = z
  .object({
    title: z.string().min(3).max(180),
    kind: z.enum(LISTING_KINDS as [string, ...string[]]),
    asking_price_cents: z.number().int().nonnegative().nullable().optional(),
    currency: z.string().length(3).optional(),
    location_state: z.string().max(80).nullable().optional(),
    description: z.string().max(8000).nullable().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const POST = withValidatedBody(
  CreateListingBody,
  async (req: NextRequest, body) => {
    if (
      !(await isAllowed("listings_owner_create", ipKey(req), {
        max: 10,
        refillPerSec: 10 / 60,
      }))
    ) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json(
        { error: "You must be signed in to post a listing." },
        { status: 401 },
      );
    }

    const result = await createListing({
      ownerUserId: user.id,
      ownerEmail: user.email,
      title: body.title,
      kind: body.kind as (typeof LISTING_KINDS)[number],
      askingPriceCents: body.asking_price_cents ?? null,
      currency: body.currency,
      locationState: body.location_state ?? null,
      description: body.description ?? null,
      payload: body.payload,
    });

    if (!result.ok) {
      log.error("createListing failed", { error: result.error, userId: user.id });
      return NextResponse.json(
        { error: "Could not create listing. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: result.listing.id,
      slug: result.listing.slug,
      status: result.listing.status,
    });
  },
);
