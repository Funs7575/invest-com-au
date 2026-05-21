import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStartupSession } from "@/lib/require-startup-session";
import { logger } from "@/lib/logger";

const log = logger("startups-data-room-revoke");

const RevokeSchema = z.object({ grant_id: z.string().uuid() });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startupId = await requireStartupSession(request);
  if (!startupId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = RevokeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { grant_id } = parsed.data;

  const supabase = await createClient();
  // RLS "Startup owner can manage access grants" uses USING (granted_by_user_id = auth.uid()).
  // The UPDATE is implicitly scoped to grants the founder created — no extra ownership check needed.
  const { data, error } = await supabase
    .from("startup_data_room_access")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", grant_id)
    .select("id")
    .maybeSingle();

  if (error) {
    log.error("Revoke failed", { startupId, grantId: grant_id, error: error.message });
    return NextResponse.json({ error: "Revoke failed" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Grant not found or not authorized" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
