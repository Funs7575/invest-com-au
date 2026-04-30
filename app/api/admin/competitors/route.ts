import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin";
import { logger, setLoggerUser } from "@/lib/logger";

const log = logger("admin-competitors");

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
  setLoggerUser(user);
  return user;
}

// GET — list recent competitor_watch entries (most recent 200)
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    setLoggerUser(admin);

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("competitor_watch")
      .select("*")
      .order("spotted_at", { ascending: false })
      .limit(200);
    return NextResponse.json(data || []);
  } catch (err) {
    log.error("Failed to fetch competitor watch", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

// POST — create a new competitor_watch entry
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  setLoggerUser(admin);

  const supabase = createAdminClient();
  const body = await request.json();
  const { competitor, event_type, title, detail, url } = body;

  if (!competitor || !event_type || !title?.trim()) {
    return NextResponse.json({ error: "competitor, event_type, title required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("competitor_watch")
    .insert({
      competitor,
      event_type,
      title: title.trim(),
      detail: detail?.trim() || null,
      url: url?.trim() || null,
      spotted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("admin_audit_log").insert({
    action: "competitor_watch:created",
    entity_type: "competitor_watch",
    entity_id: String(data.id),
    admin_email: admin.email ?? "unknown",
    details: { competitor, event_type },
  });

  return NextResponse.json(data);
}

// DELETE — remove a competitor_watch entry
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  setLoggerUser(admin);

  const supabase = createAdminClient();
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabase.from("competitor_watch").delete().eq("id", id);

  await supabase.from("admin_audit_log").insert({
    action: "competitor_watch:deleted",
    entity_type: "competitor_watch",
    entity_id: String(id),
    admin_email: admin.email ?? "unknown",
  });

  return NextResponse.json({ deleted: true });
}
