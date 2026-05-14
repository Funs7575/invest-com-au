import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { GM_INTENT_SLUGS, GM_ROUTE_TYPES } from "@/lib/api-schemas";

const ChecklistItem = z.object({
  label: z.string().min(1).max(200),
  href: z.string().max(500).optional(),
  brief_template: z.string().max(80).optional(),
});

const Cta = z.object({
  label: z.string().min(1).max(120),
  href: z.string().min(1).max(500),
});

const CrossSell = z.object({
  label: z.string().min(1).max(160),
  href: z.string().min(1).max(500),
  icon: z.string().max(40).optional(),
});

const Upsert = z.object({
  id: z.number().int().positive().optional(),
  route: z.enum(GM_ROUTE_TYPES),
  intent_slug: z.enum(GM_INTENT_SLUGS).nullable().optional(),
  headline: z.string().min(3).max(200),
  why_text: z.string().min(3).max(2000),
  checklist: z.array(ChecklistItem).max(10).default([]),
  primary_cta: Cta,
  secondary_ctas: z.array(Cta).max(3).default([]),
  cross_sells: z.array(CrossSell).max(3).default([]),
  enabled: z.boolean().default(true),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const admin = createAdminClient();
  const { data } = await admin
    .from("get_matched_result_templates")
    .select("*")
    .order("route", { ascending: true })
    .order("intent_slug", { ascending: true, nullsFirst: true });
  return NextResponse.json({ templates: data ?? [] });
}

export async function PUT(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Upsert.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }
  const admin = createAdminClient();
  const { id, ...payload } = parsed.data;
  const updated_by = guard.email;
  const updated_at = new Date().toISOString();
  if (id) {
    const { data } = await admin
      .from("get_matched_result_templates")
      .update({ ...payload, updated_by, updated_at })
      .eq("id", id)
      .select("*")
      .single();
    return NextResponse.json({ template: data });
  }
  const { data } = await admin
    .from("get_matched_result_templates")
    .upsert(
      { ...payload, updated_by, updated_at },
      { onConflict: "route,intent_slug" },
    )
    .select("*")
    .single();
  return NextResponse.json({ template: data });
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const admin = createAdminClient();
  await admin.from("get_matched_result_templates").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
