import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listingUrl } from "@/lib/listing-url";
import { logger } from "@/lib/logger";

const log = logger("invest:listing-resolver");

/**
 * Slug-only listing resolver.
 *
 * Canonical lot URLs are `/invest/<category>/listings/<slug>` (see
 * `lib/listing-url.ts`), but some callers only hold the slug — account
 * bookmarks store `ref = slug` with no vertical. This route looks the
 * listing up and 307s to its canonical page, so those callers never have
 * to duplicate the vertical→category mapping client-side.
 *
 * Unknown / removed slugs fall back to the marketplace root rather than a
 * hard 404 — a stale bookmark should land somewhere useful.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slug || typeof slug !== "string") {
    return NextResponse.redirect(new URL("/invest", request.url), 307);
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("investment_listings")
      .select("slug, vertical, sub_category, listing_kind")
      .eq("slug", slug)
      // Active and sold lots both have canonical pages now (sold renders
      // read-only); other statuses still fall back to /invest.
      .in("status", ["active", "sold"])
      .maybeSingle();

    if (data) {
      return NextResponse.redirect(new URL(listingUrl(data), request.url), 307);
    }
  } catch (err) {
    log.warn("listing resolve failed", {
      slug,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.redirect(new URL("/invest", request.url), 307);
}
