import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { BRIEF_TEMPLATES } from "@/lib/api-schemas";

const Upsert = z.object({
  rows: z.array(
    z.object({
      brief_template: z.enum(BRIEF_TEMPLATES),
      provider_type: z.enum(["any", "individual", "firm", "expert_team"]),
      credits_cost: z.number().int().min(0).max(1000),
      notes: z.string().max(500).optional(),
    }),
  ),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const admin = createAdminClient();
  const { data } = await admin
    .from("brief_credit_prices")
    .select("*")
    .order("brief_template", { ascending: true });
  return NextResponse.json({ prices: data ?? [] });
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
      { error: parsed.error.issues[0]?.message || "Invalid body." },
      { status: 400 },
    );
  }
  const admin = createAdminClient();
  for (const row of parsed.data.rows) {
    await admin
      .from("brief_credit_prices")
      .upsert(
        {
          ...row,
          updated_by: guard.email,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "brief_template,provider_type" },
      );
  }
  return NextResponse.json({ success: true, count: parsed.data.rows.length });
}
