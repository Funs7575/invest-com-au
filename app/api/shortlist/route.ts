import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Generate a short alphanumeric share code (8 chars).
 */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /api/shortlist
 * Accept array of broker slugs, generate a share code, save to DB.
 * Body: { slugs: string[] }
 * Returns: { code: string, url: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slugs: string[] = body.slugs;

    if (!Array.isArray(slugs) || slugs.length === 0 || slugs.length > 8) {
      return NextResponse.json(
        { error: "Please provide 1-8 broker slugs." },
        { status: 400 }
      );
    }

    // Validate slugs are simple strings
    const validSlugs = slugs.filter(
      (s) => typeof s === "string" && /^[a-z0-9-]+$/.test(s)
    );
    if (validSlugs.length === 0) {
      return NextResponse.json(
        { error: "Invalid broker slugs." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const code = generateCode();

    const { data, error } = await supabase
      .from("shared_shortlists")
      .insert({
        code,
        broker_slugs: validSlugs,
      })
      .select("code")
      .single();

    if (error) {
      // Handle unique code collision — retry once
      if (error.code === "23505") {
        const retryCode = generateCode();
        const { data: retryData, error: retryError } = await supabase
          .from("shared_shortlists")
          .insert({
            code: retryCode,
            broker_slugs: validSlugs,
          })
          .select("code")
          .single();

        if (retryError) {
          return NextResponse.json(
            { error: "Failed to generate share link. Try again." },
            { status: 500 }
          );
        }

        return NextResponse.json({
          code: retryData.code,
          url: `/shortlist?code=${retryData.code}`,
        });
      }

      return NextResponse.json(
        { error: "Failed to create share link." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: data.code,
      url: `/shortlist?code=${data.code}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }
}

/**
 * GET /api/shortlist?code=xxx
 * Return the broker slugs for a share code.
 * Also increments view_count.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code || code.length < 4 || code.length > 16) {
    return NextResponse.json(
      { error: "Invalid or missing share code." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Look up the shared shortlist
  const { data, error } = await supabase
    .from("shared_shortlists")
    .select("code, broker_slugs, created_at, view_count")
    .eq("code", code)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Share link not found or expired." },
      { status: 404 }
    );
  }

  // Increment view count (fire and forget)
  supabase
    .from("shared_shortlists")
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq("code", code)
    .then(() => {});

  return NextResponse.json({
    code: data.code,
    slugs: data.broker_slugs,
    created_at: data.created_at,
    view_count: (data.view_count || 0) + 1,
  });
}
