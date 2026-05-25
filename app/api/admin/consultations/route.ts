import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin-only writes for the consultation catalog. The `consultations` table is
// service_role-write only (anon/authenticated have SELECT only), so the admin
// page must mutate through this route rather than the browser client.

const UpsertSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  consultant_id: z.number().int().positive().nullable().optional(),
  duration_minutes: z.number().int().positive(),
  price: z.number().int().min(0),
  pro_price: z.number().int().min(0).nullable().optional(),
  stripe_price_id: z.string().max(200).nullable().optional(),
  stripe_pro_price_id: z.string().max(200).nullable().optional(),
  cal_link: z.string().min(1).max(500),
  category: z.string().max(100),
  status: z.string().max(50),
  featured: z.boolean(),
  sort_order: z.number().int(),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = UpsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { id, ...fields } = parsed.data;
  const admin = createAdminClient();
  const payload = { ...fields, updated_at: new Date().toISOString() };

  const { error } = id
    ? await admin.from("consultations").update(payload).eq("id", id)
    : await admin.from("consultations").insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

const DeleteSchema = z.object({ id: z.number().int().positive() });

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = DeleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("consultations")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
