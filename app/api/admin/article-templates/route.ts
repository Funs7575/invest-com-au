import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * /api/admin/article-templates
 *
 *   GET — list every active article template. Writers hit this
 *         from the "start new piece" picker in the editor.
 *
 * No POST intentionally — templates are editorial seed data managed
 * via migrations so every writer across every environment starts
 * from the same canonical structure.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("article_templates")
    .select("*")
    .eq("status", "active")
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}
