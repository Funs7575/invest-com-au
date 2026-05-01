import { NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * Returns the visitor's country code (ISO 3166-1 alpha-2) from the
 * Vercel edge geo header (`x-vercel-ip-country`). Returns `null` when
 * the header is missing — typical in dev or for non-edge requests.
 *
 * Used by `components/layout/LocationFlagButton.tsx` to render the
 * flag indicator in the top nav. Cached aggressively at the edge
 * because the value only changes per IP, not per session.
 */
export async function GET() {
  const hdrs = await headers();
  const country = hdrs.get("x-vercel-ip-country") ?? null;
  return NextResponse.json(
    { country },
    {
      headers: {
        // Cache at the edge for 1h per IP. The header is set by Vercel's
        // geo edge function so it varies by IP automatically.
        "Cache-Control": "public, max-age=0, s-maxage=3600",
      },
    },
  );
}
