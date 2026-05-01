import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Body schema for PUT. Every field is optional and value-validating,
 * matching the previous per-field `typeof === "string"` + enum
 * `.includes()` guards. Invalid values fall through to `undefined`
 * (so they're silently dropped) via the per-field
 * `.optional().catch(undefined)` — preserving the route's "drop
 * unrecognised values, reject only when zero allowed fields remain"
 * contract end-to-end. The top-level `.catch({})` keeps malformed
 * payloads on the same path the previous "no allowed fields → 400"
 * gate produces.
 */
const INVESTING_EXPERIENCES = ["beginner", "intermediate", "advanced"] as const;
const INVESTMENT_GOALS = ["growth", "income", "preservation", "speculation"] as const;
const PORTFOLIO_SIZES = [
  "under_10k",
  "10k_50k",
  "50k_200k",
  "200k_500k",
  "over_500k",
] as const;
const VALID_INTERESTS = [
  "shares",
  "etfs",
  "crypto",
  "super",
  "property",
  "savings",
  "insurance",
  "cfd_forex",
] as const;
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

const UserProfileSchema = z
  .object({
    display_name: z.string().optional().catch(undefined),
    avatar_url: z.string().optional().catch(undefined),
    investing_experience: z
      .enum(INVESTING_EXPERIENCES)
      .optional()
      .catch(undefined),
    investment_goals: z.enum(INVESTMENT_GOALS).optional().catch(undefined),
    portfolio_size: z.enum(PORTFOLIO_SIZES).optional().catch(undefined),
    interested_in: z.array(z.unknown()).optional().catch(undefined),
    preferred_broker: z.string().optional().catch(undefined),
    state: z.enum(STATES).optional().catch(undefined),
    onboarding_completed: z.boolean().optional().catch(undefined),
  })
  .passthrough()
  .catch({});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ profile: profile || null });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong on our end. Try again in a moment." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Session expired. Please sign in again." },
      { status: 401 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Some fields are invalid. Check and try again." },
      { status: 400 }
    );
  }
  const body = UserProfileSchema.parse(raw);

  // Validate fields
  const allowed: Record<string, unknown> = {};
  if (typeof body.display_name === "string") {
    const name = body.display_name.trim().slice(0, 100);
    if (name.length > 0) allowed.display_name = name;
  }
  if (typeof body.avatar_url === "string") {
    allowed.avatar_url = body.avatar_url.trim().slice(0, 500) || null;
  }
  if (body.investing_experience !== undefined) {
    allowed.investing_experience = body.investing_experience;
  }
  if (body.investment_goals !== undefined) {
    allowed.investment_goals = body.investment_goals;
  }
  if (body.portfolio_size !== undefined) {
    allowed.portfolio_size = body.portfolio_size;
  }
  if (Array.isArray(body.interested_in)) {
    allowed.interested_in = (body.interested_in as unknown[])
      .filter((i): i is (typeof VALID_INTERESTS)[number] =>
        typeof i === "string" && (VALID_INTERESTS as readonly string[]).includes(i),
      )
      .slice(0, 8);
  }
  if (typeof body.preferred_broker === "string") {
    allowed.preferred_broker = body.preferred_broker.trim().slice(0, 100) || null;
  }
  if (body.state !== undefined) {
    allowed.state = body.state;
  }
  if (typeof body.onboarding_completed === "boolean") {
    allowed.onboarding_completed = body.onboarding_completed;
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json(
      { error: "Some fields are invalid. Check and try again." },
      { status: 400 }
    );
  }

  allowed.updated_at = new Date().toISOString();

  // Upsert profile
  try {
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .upsert({ id: user.id, email: user.email, ...allowed }, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Something went wrong on our end. Try again in a moment." },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json(
      { error: "Connection issue. Please try again." },
      { status: 503 }
    );
  }
}
