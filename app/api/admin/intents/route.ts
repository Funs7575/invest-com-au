import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { GM_INTENT_SLUGS, GM_ROUTE_TYPES } from "@/lib/api-schemas";

const Upsert = z.object({
  id: z.number().int().positive().optional(),
  slug: z.enum(GM_INTENT_SLUGS),
  label: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  default_route: z.enum(GM_ROUTE_TYPES),
  default_brief_template: z.string().max(80).optional().nullable(),
  risk_level: z.enum(["low", "medium", "high"]).default("low"),
  enabled: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(10000).default(100),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const admin = createAdminClient();
  const { data } = await admin
    .from("intent_taxonomy")
    .select("*")
    .order("sort_order", { ascending: true });
  return NextResponse.json({ intents: data ?? [] });
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
      .from("intent_taxonomy")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    return NextResponse.json({ intent: data });
  }
  const { data } = await admin
    .from("intent_taxonomy")
    .upsert(payload, { onConflict: "slug" })
    .select("*")
    .single();
  return NextResponse.json({ intent: data });
}
