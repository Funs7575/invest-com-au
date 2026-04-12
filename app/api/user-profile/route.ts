import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ profile: profile || null });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Validate fields
  const allowed: Record<string, unknown> = {};
  if (typeof body.display_name === "string") {
    const name = body.display_name.trim().slice(0, 100);
    if (name.length > 0) allowed.display_name = name;
  }
  if (typeof body.avatar_url === "string") {
    allowed.avatar_url = body.avatar_url.trim().slice(0, 500) || null;
  }
  if (typeof body.investing_experience === "string" && ["beginner", "intermediate", "advanced"].includes(body.investing_experience)) {
    allowed.investing_experience = body.investing_experience;
  }
  if (typeof body.investment_goals === "string" && ["growth", "income", "preservation", "speculation"].includes(body.investment_goals)) {
    allowed.investment_goals = body.investment_goals;
  }
  if (typeof body.portfolio_size === "string" && ["under_10k", "10k_50k", "50k_200k", "200k_500k", "over_500k"].includes(body.portfolio_size)) {
    allowed.portfolio_size = body.portfolio_size;
  }
  if (typeof body.interested_in === "object" && Array.isArray(body.interested_in)) {
    const validInterests = ["shares", "etfs", "crypto", "super", "property", "savings", "insurance", "cfd_forex"];
    allowed.interested_in = body.interested_in.filter((i: string) => validInterests.includes(i)).slice(0, 8);
  }
  if (typeof body.preferred_broker === "string") {
    allowed.preferred_broker = body.preferred_broker.trim().slice(0, 100) || null;
  }
  if (typeof body.state === "string" && ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"].includes(body.state)) {
    allowed.state = body.state;
  }
  if (typeof body.onboarding_completed === "boolean") {
    allowed.onboarding_completed = body.onboarding_completed;
  }

  allowed.updated_at = new Date().toISOString();

  // Upsert profile
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .upsert({ id: user.id, email: user.email, ...allowed }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
