import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const CreateOrUpdate = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(3).max(120),
  priority: z.number().int().min(0).max(10000).default(100),
  enabled: z.boolean().default(true),
  match_conditions: z.record(z.string(), z.unknown()).default({}),
  route_to: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const admin = createAdminClient();
  const { data } = await admin
    .from("brief_routing_rules")
    .select("*")
    .order("priority", { ascending: true });
  return NextResponse.json({ rules: data ?? [] });
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
      .from("brief_routing_rules")
      .update({ ...payload, updated_by: guard.email, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    return NextResponse.json({ rule: data });
  }
  const { data } = await admin
    .from("brief_routing_rules")
    .insert({ ...payload, updated_by: guard.email })
    .select("*")
    .single();
  return NextResponse.json({ rule: data });
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
  await admin.from("brief_routing_rules").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
