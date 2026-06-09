import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("cron-geocode-listings");
const BATCH_SIZE = 50;

// Resolve a city+state string to lat/lng via the existing postcodes endpoint.
// Returns null if the lookup fails (not an error — listings without a precise
// address can't be geocoded and are simply skipped).
async function geocodeLocation(
  city: string | null,
  state: string | null,
): Promise<{ lat: number; lng: number } | null> {
  if (!city && !state) return null;
  const q = encodeURIComponent([city, state, "Australia"].filter(Boolean).join(", "));
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://invest.com.au";

  try {
    const res = await fetch(`${baseUrl}/api/advisor-search/postcodes?q=${q}`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: { lat: number; lng: number }[];
    };
    const first = data.results?.[0];
    if (!first) return null;
    return { lat: first.lat, lng: first.lng };
  } catch {
    return null;
  }
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  // Fetch up to BATCH_SIZE active listings without coordinates.
  const { data: listings, error } = await supabase
    .from("investment_listings")
    .select("id, location_city, location_state")
    .eq("status", "active")
    .is("latitude", null)
    .limit(BATCH_SIZE);

  if (error) {
    log.error("failed to fetch listings", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!listings || listings.length === 0) {
    log.info("no listings to geocode");
    return NextResponse.json({ ok: true, geocoded: 0, remaining: 0 });
  }

  let geocoded = 0;
  let skipped = 0;

  for (const listing of listings) {
    const coords = await geocodeLocation(
      listing.location_city as string | null,
      listing.location_state as string | null,
    );

    if (!coords) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("investment_listings")
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq("id", listing.id);

    if (updateError) {
      log.warn("geocode update failed", { id: listing.id, error: updateError.message });
      skipped++;
    } else {
      geocoded++;
    }
  }

  // Count remaining un-geocoded listings for observability.
  const { count: remaining } = await supabase
    .from("investment_listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .is("latitude", null);

  log.info("geocode batch complete", { geocoded, skipped, remaining: remaining ?? 0 });

  return NextResponse.json({
    ok: true,
    geocoded,
    skipped,
    remaining: remaining ?? 0,
  });
}

export const GET = wrapCronHandler("geocode-listings", handler);
