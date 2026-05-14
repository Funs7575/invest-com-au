import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { GM_QUESTION_MODES } from "@/lib/api-schemas";

const Upsert = z.object({
  id: z.number().int().positive().optional(),
  slug: z.string().min(2).max(80),
  step: z.number().int().min(0).max(50).default(0),
  kind: z.enum(["select", "multiselect", "text", "number", "contextual"]),
  prompt: z.string().min(3).max(400),
  subtitle: z.string().max(400).optional(),
  options: z.array(z.record(z.string(), z.unknown())).max(40).default([]),
  shown_if: z.record(z.string(), z.unknown()).default({}),
  maps_to: z.string().min(1).max(80),
  risk_weight: z.number().int().min(0).max(100).default(0),
  mode: z.enum(GM_QUESTION_MODES).default("both"),
  enabled: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(10000).default(100),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const admin = createAdminClient();
  const { data } = await admin
    .from("get_matched_questions")
    .select("*")
    .order("step", { ascending: true })
    .order("sort_order", { ascending: true });
  return NextResponse.json({ questions: data ?? [] });
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
  if (id) {
    const { data } = await admin
      .from("get_matched_questions")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    return NextResponse.json({ question: data });
  }
  const { data } = await admin
    .from("get_matched_questions")
    .upsert(payload, { onConflict: "slug" })
    .select("*")
    .single();
  return NextResponse.json({ question: data });
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const admin = createAdminClient();
  await admin.from("get_matched_questions").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
