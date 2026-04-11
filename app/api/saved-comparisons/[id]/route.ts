import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("saved-comparisons");

const MAX_NAME_LENGTH = 100;
const MAX_NOTES_LENGTH = 2000;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: comparison, error } = await supabase
      .from("user_saved_comparisons")
      .select("id, name, broker_slugs, quiz_results, notes, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !comparison) {
      return NextResponse.json({ error: "Comparison not found" }, { status: 404 });
    }

    return NextResponse.json({ comparison });
  } catch (err) {
    log.error("Saved comparison GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load comparison" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    // Build update payload - only allow name and notes
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.name === "string") {
      const name = body.name.trim().slice(0, MAX_NAME_LENGTH);
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updates.name = name;
    }

    if (body.notes !== undefined) {
      updates.notes = typeof body.notes === "string"
        ? body.notes.trim().slice(0, MAX_NOTES_LENGTH) || null
        : null;
    }

    const { data: comparison, error } = await supabase
      .from("user_saved_comparisons")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, broker_slugs, quiz_results, notes, created_at, updated_at")
      .single();

    if (error || !comparison) {
      return NextResponse.json({ error: "Comparison not found" }, { status: 404 });
    }

    return NextResponse.json({ comparison });
  } catch (err) {
    log.error("Saved comparison PATCH error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update comparison" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await supabase
      .from("user_saved_comparisons")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      log.error("Failed to delete comparison", { error: error.message, userId: user.id });
      return NextResponse.json({ error: "Failed to delete comparison" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Saved comparison DELETE error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete comparison" }, { status: 500 });
  }
}
