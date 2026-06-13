import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";

/**
 * Current fee snapshot for a small set of brokers (Northstar D10 — the
 * "since you were here" strip diffs these against the visitor's
 * locally-remembered values). Public factual data: `brokers` has an anon
 * SELECT policy, so this reads through the request-scoped client, not the
 * service role.
 */

const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

const QuerySchema = z.object({
  slugs: z
    .string()
    .min(1)
    .max(800)
    .transform((raw) => raw.split(",").map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.string().regex(SLUG_PATTERN)).min(1).max(10)),
});

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (await isRateLimited(`broker_fees:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = QuerySchema.safeParse({
    slugs: req.nextUrl.searchParams.get("slugs") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid slugs" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brokers")
    .select("slug, name, asx_fee_value, us_fee_value, fee_last_checked")
    .in("slug", parsed.data.slugs)
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  return NextResponse.json(
    { brokers: data ?? [] },
    {
      headers: {
        // Fees change on a cron cadence — short shared cache is plenty.
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
