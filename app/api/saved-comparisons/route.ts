import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";

const log = logger("saved-comparisons");

const MAX_COMPARISONS = 25;
const MAX_NAME_LENGTH = 100;
const MAX_NOTES_LENGTH = 2000;
const MAX_BROKER_SLUGS = 20;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const { data: comparisons, error } = await supabase
      .from("user_saved_comparisons")
      .select("id, name, broker_slugs, quiz_results, notes, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      log.error("Failed to fetch comparisons", { error: error.message, userId: user.id });
      return NextResponse.json(
        { error: "Something went wrong on our end. Try again in a moment." },
        { status: 500 }
      );
    }

    return NextResponse.json({ comparisons: comparisons ?? [] });
  } catch (err) {
    log.error("Saved comparisons GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Connection issue. Please try again." },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    // Rate limit: 20 per hour per user
    const limited = await isRateLimited(`save-comparison:${user.id}`, 20, 60);
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Check max comparisons limit
    const { count, error: countError } = await supabase
      .from("user_saved_comparisons")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      log.error("Failed to count comparisons", { error: countError.message, userId: user.id });
      return NextResponse.json(
        { error: "Something went wrong on our end. Try again in a moment." },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= MAX_COMPARISONS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_COMPARISONS} saved comparisons reached. Please delete one to save a new one.` },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Some fields are invalid. Check and try again." },
        { status: 400 }
      );
    }

    // Validate inputs
    const name = typeof body.name === "string"
      ? body.name.trim().slice(0, MAX_NAME_LENGTH)
      : "My Comparison";

    if (!name) {
      return NextResponse.json(
        { error: "Some fields are invalid. Check and try again." },
        { status: 400 }
      );
    }

    const brokerSlugs = Array.isArray(body.broker_slugs)
      ? body.broker_slugs
          .filter((s: unknown): s is string => typeof s === "string" && s.length > 0)
          .slice(0, MAX_BROKER_SLUGS)
      : [];

    if (brokerSlugs.length === 0) {
      return NextResponse.json(
        { error: "Some fields are invalid. Check and try again." },
        { status: 400 }
      );
    }

    const quizResults = body.quiz_results && typeof body.quiz_results === "object"
      ? body.quiz_results
      : null;

    const notes = typeof body.notes === "string"
      ? body.notes.trim().slice(0, MAX_NOTES_LENGTH)
      : null;

    const { data: comparison, error } = await supabase
      .from("user_saved_comparisons")
      .insert({
        user_id: user.id,
        name,
        broker_slugs: brokerSlugs,
        quiz_results: quizResults,
        notes: notes || null,
      })
      .select("id, name, broker_slugs, quiz_results, notes, created_at, updated_at")
      .single();

    if (error) {
      log.error("Failed to save comparison", { error: error.message, userId: user.id });
      return NextResponse.json(
        { error: "Something went wrong on our end. Try again in a moment." },
        { status: 500 }
      );
    }

    return NextResponse.json({ comparison }, { status: 201 });
  } catch (err) {
    log.error("Saved comparisons POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Connection issue. Please try again." },
      { status: 503 }
    );
  }
}
