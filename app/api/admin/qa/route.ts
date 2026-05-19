import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin";
import { logger } from "@/lib/logger";

const log = logger("admin-qa-list");

export async function GET(_req: NextRequest) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();
  if (authError || !user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("qa_questions")
    .select("id, slug, question_text, category, email, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    log.error("qa_questions fetch failed", { error: error.message });
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }

  return NextResponse.json({ questions: data ?? [] });
}
