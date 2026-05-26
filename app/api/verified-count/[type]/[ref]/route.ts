/**
 * GET /api/verified-count/[type]/[ref]
 *
 * Returns the count of users who have verified a product.
 * Reads from the product_user_verified_counts view.
 *
 * Response is CDN-cached (60 s fresh, 300 s stale) so high-traffic
 * product pages don't hit the DB on every render.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID_TYPES = new Set(["broker", "etf", "advisor", "property"]);

export async function GET(req: NextRequest) {
  const segments = req.nextUrl.pathname.split("/");
  // pathname: /api/verified-count/<type>/<ref>
  const typeIdx = segments.indexOf("verified-count");
  const productType = segments[typeIdx + 1] ?? "";
  const productRef = decodeURIComponent(segments[typeIdx + 2] ?? "");

  if (!VALID_TYPES.has(productType) || !productRef) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_user_verified_counts")
    .select("verified_count")
    .eq("product_type", productType)
    .eq("product_ref", productRef)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const count = data?.verified_count ?? 0;

  return NextResponse.json(
    { product_type: productType, product_ref: productRef, verified_count: count },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
