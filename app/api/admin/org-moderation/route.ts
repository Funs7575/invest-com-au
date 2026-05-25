import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";

const ActionBody = z.object({
  applicationId: z.number().int().positive(),
  action: z.enum(["approve", "reject"]),
  rejection_reason: z.string().max(500).optional(),
});

const log = logger("admin-org-moderation");

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
  const parsed = ActionBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { applicationId, action, rejection_reason } = parsed.data;
  const admin = createAdminClient();

  const { data: app } = await admin
    .from("organisation_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if ((app as { status: string }).status !== "pending") {
    return NextResponse.json({ error: "Application already processed" }, { status: 409 });
  }

  if (action === "reject") {
    await admin
      .from("organisation_applications")
      .update({ status: "rejected", rejection_reason: rejection_reason ?? null })
      .eq("id", applicationId);

    log.info("org application rejected", { applicationId });
    return NextResponse.json({ success: true, action: "rejected" });
  }

  // Approve: invite the contact via Supabase auth, create org row
  const appData = app as {
    id: number;
    organisation_name: string;
    organisation_type: string;
    abn: string | null;
    website: string | null;
    contact_name: string;
    contact_email: string;
    contact_phone: string | null;
    bio: string | null;
    cpd_provider_number: string | null;
  };

  // Invite applicant — creates auth.users row + sends magic link
  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    appData.contact_email,
    {
      data: { display_name: appData.contact_name },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/org-portal`,
    }
  );

  if (inviteErr && inviteErr.message !== "A user with this email address has already been registered") {
    log.error("org invite failed", { error: inviteErr.message, applicationId });
    return NextResponse.json({ error: "Failed to invite user: " + inviteErr.message }, { status: 500 });
  }

  // Find the auth user (either newly invited or existing)
  let adminUserId: string | null = null;
  if (inviteData?.user) {
    adminUserId = inviteData.user.id;
  } else {
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existing = existingUsers?.users.find(u => u.email?.toLowerCase() === appData.contact_email.toLowerCase());
    adminUserId = existing?.id ?? null;
  }

  if (!adminUserId) {
    log.error("could not find/create admin user", { applicationId });
    return NextResponse.json({ error: "Could not resolve admin user" }, { status: 500 });
  }

  // Generate slug from org name
  const slug = appData.organisation_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) + "-" + applicationId;

  const { data: org, error: orgErr } = await admin
    .from("organisations")
    .insert({
      slug,
      name: appData.organisation_name,
      organisation_type: appData.organisation_type,
      abn: appData.abn,
      website: appData.website,
      email: appData.contact_email,
      phone: appData.contact_phone,
      bio: appData.bio,
      cpd_provider_number: appData.cpd_provider_number,
      admin_user_id: adminUserId,
      status: "active",
      verification_status: "pending",
      tier: "free",
    })
    .select("id, slug")
    .single();

  if (orgErr) {
    log.error("org insert failed", { error: orgErr.message, applicationId });
    return NextResponse.json({ error: orgErr.message }, { status: 500 });
  }

  await admin
    .from("organisation_applications")
    .update({ status: "approved" })
    .eq("id", applicationId);

  log.info("org approved", { applicationId, orgId: (org as { id: number }).id, slug });
  return NextResponse.json({ success: true, action: "approved", org });
}
