import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    const supabase = await createClient();

    let query = supabase
      .from("suburb_data")
      .select("suburb, state, postcode, median_price_house, median_price_unit, rental_yield_house, rental_yield_unit, vacancy_rate, capital_growth_1yr, capital_growth_3yr, capital_growth_5yr, capital_growth_10yr, population, population_growth, median_age, median_income, distance_to_cbd_km")
      .order("suburb", { ascending: true });

    if (q && q.length >= 2) {
      query = query.ilike("suburb", `%${q}%`);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error("Suburb search error:", error);
      return NextResponse.json({ error: "Failed to search suburbs" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Suburbs API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
