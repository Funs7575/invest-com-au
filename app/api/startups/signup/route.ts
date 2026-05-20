import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("startup-signup");

const StartupSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  company_name: z.string().min(1).max(200),
  abn: z.string().max(20).nullable().optional(),
  founded_year: z.number().int().min(1990).max(new Date().getFullYear()).nullable().optional(),
  stage: z.enum(["pre_seed", "seed", "series_a", "series_b", "series_c", "growth"]),
  sector: z.array(z.string().max(50)).min(1).max(10),
  linkedin_url: z.string().url().max(300).nullable().optional(),
  team_size: z.number().int().min(1).max(10000).nullable().optional(),
  esic_self_attested: z.boolean().default(false),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`startup_signup:${ip}`, 3, 60)) {
      return NextResponse.json({ error: "Too many signup attempts. Please try again later." }, { status: 429 });
    }

    const body: unknown = await request.json();
    const parsed = StartupSignupSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Invalid request data." },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      company_name,
      abn,
      founded_year,
      stage,
      sector,
      linkedin_url,
      team_size,
      esic_self_attested,
    } = parsed.data;

    const admin = createAdminClient();

    // Create Supabase auth user (returns 409-style error on duplicate email)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: false, // founder needs to verify email
      user_metadata: {
        full_name: company_name,
        role: "startup_founder",
      },
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already been registered") ||
          authError.message.toLowerCase().includes("already exists")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 409 }
        );
      }
      log.error("Auth user creation failed", { error: authError.message });
      return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
    }

    const userId = authData.user.id;

    // Generate unique slug from company name
    const slugBase = slugify(company_name);
    const { data: slugConflict } = await admin
      .from("startup_profiles")
      .select("id")
      .eq("slug", slugBase)
      .maybeSingle();
    const slug = slugConflict ? `${slugBase}-${Date.now().toString(36)}` : slugBase;

    // Insert startup_profiles row in draft status
    const foundedAt = founded_year ? `${founded_year}-01-01` : null;
    const teamJson = team_size ? JSON.stringify([{ count: team_size }]) : JSON.stringify([]);

    const { data: profile, error: insertError } = await admin
      .from("startup_profiles")
      .insert({
        slug,
        company_name,
        abn: abn ?? null,
        founded_at: foundedAt,
        stage,
        sector,
        team: teamJson,
        linkedin_url: linkedin_url ?? null,
        esic_eligible_self_attested: esic_self_attested,
        owner_user_id: userId,
        status: "draft",
      })
      .select("id, slug")
      .single();

    if (insertError) {
      log.error("Startup profile insert failed", { error: insertError.message, userId });
      // Roll back auth user
      await admin.auth.admin.deleteUser(userId).catch(() => void 0);
      return NextResponse.json({ error: "Failed to create startup profile. Please try again." }, { status: 500 });
    }

    log.info("New startup founder registered", {
      company_name,
      email,
      profileId: profile.id,
      slug: profile.slug,
    });

    return NextResponse.json({
      success: true,
      message: "Startup profile submitted for review.",
      slug: profile.slug,
    });
  } catch (err) {
    log.error("Startup signup handler error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
