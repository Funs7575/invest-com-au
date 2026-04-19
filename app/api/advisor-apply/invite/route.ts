import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

// Public endpoint: look up an invite token to pre-fill the apply form
export async function GET(request: NextRequest) {
  if (!(await isAllowed("advisor_apply_invite_get", ipKey(request), { max: 20, refillPerSec: 0.1 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: invite } = await supabase
    .from("advisor_firm_invitations")
    .select("id, email, name, status, expires_at, role, firm_id, advisor_firms(name)")
    .eq("token", token)
    .single();

  if (!invite) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ error: "This invitation has already been used or revoked." }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) {
    // Mark expired
    await supabase.from("advisor_firm_invitations").update({ status: "expired" }).eq("id", invite.id);
    return NextResponse.json({ error: "This invitation has expired. Please ask your firm admin to resend it." }, { status: 410 });
  }

  const firm = invite.advisor_firms as unknown as { name: string } | null;

  return NextResponse.json({
    email: invite.email,
    name: invite.name || null,
    firmName: firm?.name || null,
    firmId: invite.firm_id,
    role: invite.role || "member",
  });
}
