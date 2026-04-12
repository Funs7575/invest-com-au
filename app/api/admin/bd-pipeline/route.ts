import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin";
import { logger } from "@/lib/logger";

const log = logger("admin-bd-pipeline");

async function requireAdmin() {
  const supabaseAuth = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (
    authError ||
    !user ||
    !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")
  ) {
    return null;
  }
  return user;
}

// GET — list all pipeline entries
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("bd_pipeline")
      .select("*")
      .order("updated_at", { ascending: false });
    return NextResponse.json(data || []);
  } catch (err) {
    log.error("Failed to fetch BD pipeline", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }
}

// POST — create or update a pipeline entry
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();
  const { id, ...fields } = body;

  if (!fields.company_name) {
    return NextResponse.json({ error: "company_name required" }, { status: 400 });
  }

  fields.updated_at = new Date().toISOString();

  if (id) {
    // Update existing
    const { data, error } = await supabase
      .from("bd_pipeline")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    // Create new
    const { data, error } = await supabase
      .from("bd_pipeline")
      .insert(fields)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
}

// DELETE — remove a pipeline entry
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabase.from("bd_pipeline").delete().eq("id", id);
  return NextResponse.json({ deleted: true });
}
