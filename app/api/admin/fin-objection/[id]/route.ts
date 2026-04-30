import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFinObjectionEmails } from "@/lib/admin";
import { logger, setLoggerUser } from "@/lib/logger";

const log = logger("admin-fin-objection");

async function requireFinObjectionAuth() {
  const supabaseAuth = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return { status: 401 as const, user: null };
  }
  if (!getFinObjectionEmails().includes(user.email?.toLowerCase() || "")) {
    return { status: 403 as const, user };
  }
  return { status: 200 as const, user };
}

// POST — stamp fin_objection_at on a review_passed article.
// Used by Fin to object during the 4-hour auto-publish window per
// .claude/agents/04-editorial.md. Service-role DB write is gated by the
// narrower FIN_OBJECTION_EMAILS allowlist (admin ≠ Fin — see lib/admin.ts
// and TODO.md).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, user } = await requireFinObjectionAuth();

  if (status === 401) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (status === 403) {
    return NextResponse.json(
      { error: "Fin-objection access required" },
      { status: 403 }
    );
  }
  if (user) setLoggerUser(user);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("editorial_articles")
    .update({ fin_objection_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "review_passed")
    .select("id, fin_objection_at, status")
    .single();

  if (error) {
    log.error("Failed to stamp fin_objection_at", { id, err: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Article not found or not in review_passed state" },
      { status: 404 }
    );
  }

  log.info("fin_objection_at stamped", { id, by: user.email });

  const adminDb = createAdminClient();
  await adminDb.from("admin_audit_log").insert({
    action: "editorial_article:fin_objection",
    entity_type: "editorial_article",
    entity_id: id,
    entity_name: `article #${id}`,
    admin_email: user.email ?? "",
    details: { fin_objection_at: data.fin_objection_at },
  });

  return NextResponse.json({
    id: data.id,
    fin_objection_at: data.fin_objection_at,
  });
}
