/**
 * POST /api/admin/foreign-investment/revalidate
 *
 * Manually busts ALL fi-data cache tags so Next.js ISR re-fetches from
 * Supabase on the next request. Useful after bulk DB updates or after
 * running the SQL migration seed.
 *
 * Body: { adminEmail: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminEmails } from "@/lib/admin";

const FI_CACHE_TAGS = [
  "fi-data",
  "fi-data-categories",
  "fi-tax-non-resident",
  "fi-tax-resident",
  "fi-dta-countries",
  "fi-dasp-rates",
  "fi-withholding-rates",
  "fi-property-rules",
  "fi-change-log",
];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (token !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { adminEmail: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes((body.adminEmail ?? "").toLowerCase())) {
    return NextResponse.json({ error: "Not an admin email" }, { status: 403 });
  }

  FI_CACHE_TAGS.forEach((tag) => revalidateTag(tag, {}));

  return NextResponse.json({ ok: true, busted: FI_CACHE_TAGS });
}
