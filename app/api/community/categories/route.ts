import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("community:categories");

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("forum_categories")
      .select("id, slug, name, description, icon, color, sort_order, thread_count, post_count, last_thread_id, last_post_at")
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (error) {
      log.error("Failed to fetch categories", { error: error.message });
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }

    return NextResponse.json({ categories: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
