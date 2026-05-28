import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("advisor_user_match_scores")
    .select("professional_id, match_percent")
    .eq("user_id", user.id)
    .order("match_percent", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });

  // Return as a map for O(1) lookup in the directory
  const scores: Record<number, number> = {};
  for (const row of data ?? []) {
    scores[row.professional_id as number] = row.match_percent as number;
  }

  return NextResponse.json({ scores });
}
