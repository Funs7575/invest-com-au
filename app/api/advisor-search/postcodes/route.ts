import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("advisor-search:postcodes");

export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ postcodes: [] });
    }

    const supabase = await createClient();
    const term = q.trim();

    // Check if the search term looks like a postcode (numeric) or a suburb name
    const isPostcode = /^\d+$/.test(term);

    let query = supabase
      .from("au_postcodes")
      .select("postcode, locality, state, latitude, longitude");

    if (isPostcode) {
      query = query.like("postcode", `${term}%`);
    } else {
      query = query.ilike("locality", `%${term}%`);
    }

    const { data, error } = await query
      .order("locality", { ascending: true })
      .limit(10);

    if (error) {
      log.error("Postcode search error:", error);
      return NextResponse.json(
        { error: "Search failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ postcodes: data ?? [] });
  } catch (err) {
    log.error("Postcode search error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
