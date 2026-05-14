import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const CreateOrUpdate = z.object({
  id: z.number().int().positive().optional(),
  pattern: z.string().min(2).max(200),
  category: z.string().min(2).max(80),
  severity: z.enum(["warn", "review", "block"]),
  enabled: z.boolean().default(true),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const admin = createAdminClient();
  const { data } = await admin
    .from("brief_risk_patterns")
    .select("*")
    .order("severity", { ascending: false });
  return NextResponse.json({ patterns: data ?? [] });
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
  const parsed = CreateOrUpdate.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid body." },
      { status: 400 },
    );
  }
  const admin = createAdminClient();
  const { id, ...payload } = parsed.data;
  if (id) {
    const { data } = await admin
      .from("brief_risk_patterns")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    return NextResponse.json({ pattern: data });
  }
  const { data } = await admin
    .from("brief_risk_patterns")
    .upsert(payload, { onConflict: "pattern,category" })
    .select("*")
    .single();
  return NextResponse.json({ pattern: data });
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const idStr = request.nextUrl.searchParams.get("id");
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const admin = createAdminClient();
  await admin.from("brief_risk_patterns").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
