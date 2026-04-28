import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createPreviewToken,
  listTokensForArticle,
  revokePreviewToken,
} from "@/lib/article-preview-tokens";

export const runtime = "nodejs";

/**
 * /api/admin/article-preview-tokens
 *
 *   GET  ?slug=... — list every token for an article (admin
 *                    surface shows active + revoked for audit)
 *   POST            — body: { slug, ttl_hours?, note? }
 *                    creates a new share token, returns the token
 *                    string (only shown once; cannot be re-read)
 *   DELETE         — body: { id } revokes a token
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  const items = await listTokensForArticle(slug);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug : null;
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const ttlHours = typeof body.ttl_hours === "number" && body.ttl_hours > 0
    ? Math.min(body.ttl_hours, 24 * 14) // cap at 14 days
    : 72;
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : null;

  const result = await createPreviewToken({
    articleSlug: slug,
    createdBy: guard.email,
    ttlHours,
    note,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const supabase = createAdminClient();
  await supabase.from("admin_audit_log").insert({
    action: "article_preview_token:created",
    entity_type: "article_preview_token",
    entity_name: slug,
    admin_email: guard.email,
    details: { article_slug: slug, ttl_hours: ttlHours, note },
  });

  return NextResponse.json({ ok: true, token: result.token });
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "number" ? body.id : null;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const result = await revokePreviewToken(id);

  if (result.ok) {
    const supabase = createAdminClient();
    await supabase.from("admin_audit_log").insert({
      action: "article_preview_token:revoked",
      entity_type: "article_preview_token",
      entity_id: String(id),
      entity_name: `token #${id}`,
      admin_email: guard.email,
      details: { token_id: id },
    });
  }

  return NextResponse.json({ ok: result.ok });
}
