import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStartupSession } from "@/lib/require-startup-session";
import { logger } from "@/lib/logger";

const log = logger("startups-data-room-grant");

const GrantSchema = z.object({
  file_id: z.string().uuid(),
  inquiry_id: z.string().uuid(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startupId = await requireStartupSession(request);
  if (!startupId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = GrantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { file_id, inquiry_id } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve investor from inquiry
  const { data: inquiry } = await supabase
    .from("startup_investor_inquiries")
    .select("id, investor_user_id, round_id")
    .eq("id", inquiry_id)
    .maybeSingle();

  if (!inquiry) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });

  // Verify the round belongs to this startup (guards cross-startup grant attempts)
  const { data: round } = await supabase
    .from("startup_rounds")
    .select("startup_id")
    .eq("id", inquiry.round_id)
    .maybeSingle();
  if (!round || round.startup_id !== startupId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const investorUserId = inquiry.investor_user_id;

  // Verify file belongs to this startup (owner policy enforces this)
  const { data: file } = await supabase
    .from("startup_data_room_files")
    .select("id")
    .eq("id", file_id)
    .eq("startup_id", startupId)
    .maybeSingle();
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // Upsert: re-grant if previously revoked, no-op if already active
  const { data: existing } = await supabase
    .from("startup_data_room_access")
    .select("id, revoked_at")
    .eq("file_id", file_id)
    .eq("granted_to_user_id", investorUserId)
    .maybeSingle();

  if (existing && !existing.revoked_at) {
    return NextResponse.json({ id: existing.id, already_granted: true });
  }

  if (existing?.revoked_at) {
    const { error: upErr } = await supabase
      .from("startup_data_room_access")
      .update({ revoked_at: null, granted_at: new Date().toISOString(), granted_by_user_id: user.id })
      .eq("id", existing.id);
    if (upErr) {
      log.error("Re-grant failed", { startupId, error: upErr.message });
      return NextResponse.json({ error: "Grant failed" }, { status: 500 });
    }
    return NextResponse.json({ id: existing.id });
  }

  const { data: grant, error: grantErr } = await supabase
    .from("startup_data_room_access")
    .insert({ file_id, granted_to_user_id: investorUserId, granted_by_user_id: user.id })
    .select("id")
    .single();

  if (grantErr) {
    log.error("Grant insert failed", { startupId, error: grantErr.message });
    return NextResponse.json({ error: "Grant failed" }, { status: 500 });
  }

  // Mark inquiry as having data-room access granted
  await supabase
    .from("startup_investor_inquiries")
    .update({ data_room_access_granted_at: new Date().toISOString() })
    .eq("id", inquiry_id);

  return NextResponse.json({ id: grant.id }, { status: 201 });
}
