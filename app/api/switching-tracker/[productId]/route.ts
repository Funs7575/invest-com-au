/**
 * /api/switching-tracker/[productId]
 *
 * DELETE — mark a tracked product as switched or closed.
 *
 * Rate-limits: 30/min/IP
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ipKey, isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:switching-tracker:delete");

const StatusSchema = z.enum(["switched", "closed"]);

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  if (!(await isAllowed("switching_tracker_delete", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { productId } = await params;
  const reasonRaw = new URL(req.url).searchParams.get("reason") ?? "closed";
  const parsed = StatusSchema.safeParse(reasonRaw);
  const newStatus = parsed.success ? parsed.data : "closed";

  const { error } = await supabase
    .from("user_current_products")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("user_id", user.id);

  if (error) {
    log.warn("switching-tracker delete failed", { error: error.message });
    return NextResponse.json({ error: "Could not update product." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
