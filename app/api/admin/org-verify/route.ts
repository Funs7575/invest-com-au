import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";

const Body = z.object({
  organisationId: z.number().int().positive(),
  action: z.enum(["verify", "unverify"]),
});

const log = logger("admin-org-verify");

export async function PATCH(req: NextRequest) {
  const supabaseAuth = await createClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(user.email?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.json();
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { organisationId, action } = parsed.data;
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organisations")
    .select("id, name, verification_status")
    .eq("id", organisationId)
    .maybeSingle();

  if (!org) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  const newStatus = action === "verify" ? "verified" : "unverified";
  const { error: updateErr } = await admin
    .from("organisations")
    .update({ verification_status: newStatus })
    .eq("id", organisationId);

  if (updateErr) {
    log.error("org verify update failed", { error: updateErr.message, organisationId });
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  log.info("org verification updated", { organisationId, action, newStatus });
  return NextResponse.json({ success: true, verification_status: newStatus });
}
