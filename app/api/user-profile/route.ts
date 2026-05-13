import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const log = logger("api:user-profile");

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

  // Save profile. Prefer UPDATE for existing users so a partially-missing
  // INSERT/upsert RLS policy cannot block users who already have a profile row
  // (the account menu can read that row, which is the failing onboarding case).
  try {
    const saveProfile = async (fields: Record<string, unknown>) => {
      const updateFields = { email: user.email, ...fields };
      const updated = await supabase
        .from("user_profiles")
        .update(updateFields)
        .eq("id", user.id)
        .select()
        .maybeSingle();

      if (updated.error || updated.data) return updated;

      return supabase
        .from("user_profiles")
        .insert({ id: user.id, ...updateFields })
        .select()
        .single();
    };

    const { data: profile, error } = await saveProfile(allowed);

    if (error) {
      // Onboarding's final detail fields are optional. In production, a single
      // stale enum/check constraint or newly-added profile column should not
      // trap users on /onboarding after they have already completed the
      // required steps. If an enriched onboarding save fails, retry the minimum
      // completion update and keep the existing profile details intact.
      if (allowed.onboarding_completed === true) {
        log.warn("Full onboarding profile save failed; retrying completion-only update", {
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message,
          user_id: user.id,
        });

        const retry = await saveProfile({
          onboarding_completed: true,
          updated_at: allowed.updated_at,
        });

        if (!retry.error) {
          return NextResponse.json({ profile: retry.data });
        }

        log.error("Completion-only onboarding profile save failed", {
          code: retry.error.code,
          details: retry.error.details,
          hint: retry.error.hint,
          message: retry.error.message,
          user_id: user.id,
        });
      }

      return NextResponse.json(
        { error: "Something went wrong on our end. Try again in a moment." },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (err) {
    log.error("User profile save threw", { err, user_id: user.id });
    return NextResponse.json(
      { error: "Connection issue. Please try again." },
      { status: 503 }
    );
  }
}
