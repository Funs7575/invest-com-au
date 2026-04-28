import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listPendingComments,
  setCommentStatus,
} from "@/lib/article-comments";

export const runtime = "nodejs";

/**
 * /api/admin/article-comments
 *
 *   GET   — list every 'pending' comment oldest-first. Rows are
 *           comments that escalated (legal-risk phrases, low author
 *           reputation, etc) and are waiting for human review.
 *   PATCH — { id, action: 'publish' | 'reject' | 'remove' }
 *           Flip the row's status. 'published' shows on the article.
 *           'rejected' + 'removed' keep the row for audit but hide
 *           it from the article.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const items = await listPendingComments();
  return NextResponse.json({ items });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "number" ? body.id : null;
  const action = body.action as "publish" | "reject" | "remove" | undefined;
  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  const statusMap = {
    publish: "published" as const,
    reject: "rejected" as const,
    remove: "removed" as const,
  };
  const ok = await setCommentStatus({
    id,
    status: statusMap[action],
    moderatorEmail: guard.email,
  });
  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  const supabase = createAdminClient();
  await supabase.from("admin_audit_log").insert({
    action: `article_comment:${action}`,
    entity_type: "article_comment",
    entity_id: String(id),
    entity_name: `comment #${id}`,
    admin_email: guard.email,
    details: { new_status: statusMap[action] },
  });

  return NextResponse.json({ ok: true, status: statusMap[action] });
}
