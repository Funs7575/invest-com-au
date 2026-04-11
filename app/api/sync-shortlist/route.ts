import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("sync-shortlist");

const MAX_SHORTLIST = 8;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: shortlist, error } = await supabase
      .from("user_shortlisted_brokers")
      .select("broker_slug, added_at")
      .eq("user_id", user.id)
      .order("added_at", { ascending: true });

    if (error) {
      log.error("Failed to fetch shortlist", { error: error.message, userId: user.id });
      return NextResponse.json({ error: "Failed to load shortlist" }, { status: 500 });
    }

    const slugs = (shortlist ?? []).map((item) => item.broker_slug);

    return NextResponse.json({ slugs });
  } catch (err) {
    log.error("Sync shortlist GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load shortlist" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    const brokerSlugs = Array.isArray(body.slugs)
      ? body.slugs
          .filter((s: unknown): s is string => typeof s === "string" && s.length > 0)
          .slice(0, MAX_SHORTLIST)
      : [];

    // Delete existing shortlist for user, then insert new one
    const { error: deleteError } = await supabase
      .from("user_shortlisted_brokers")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      log.error("Failed to clear shortlist", { error: deleteError.message, userId: user.id });
      return NextResponse.json({ error: "Failed to sync shortlist" }, { status: 500 });
    }

    if (brokerSlugs.length > 0) {
      const rows = brokerSlugs.map((slug: string) => ({
        user_id: user.id,
        broker_slug: slug,
      }));

      const { error: insertError } = await supabase
        .from("user_shortlisted_brokers")
        .insert(rows);

      if (insertError) {
        log.error("Failed to insert shortlist", { error: insertError.message, userId: user.id });
        return NextResponse.json({ error: "Failed to sync shortlist" }, { status: 500 });
      }
    }

    return NextResponse.json({ slugs: brokerSlugs });
  } catch (err) {
    log.error("Sync shortlist POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to sync shortlist" }, { status: 500 });
  }
}
