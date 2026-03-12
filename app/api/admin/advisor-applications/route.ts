import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { sendApplicationApproved, sendApplicationRejected } from "@/lib/advisor-emails";
import { getSiteUrl } from "@/lib/url";
import { ADMIN_EMAILS } from "@/lib/admin";

function createAdminSupabase() {
  return createAdminClient();
}

async function requireAdmin() {
  const supabaseAuth = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (
    authError ||
    !user ||
    !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")
  ) {
    return null;
  }
  return user;
}

// GET - list applications
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminSupabase();
  const status = request.nextUrl.searchParams.get("status") || "pending";

  const { data, error } = await supabase
    .from("advisor_applications")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin] list applications error:", error.message);
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }
  return NextResponse.json({ applications: data || [] });
}

// PATCH - approve or reject
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminSupabase();
  const siteUrl = getSiteUrl(request.headers.get("host"));

  let body: { applicationId: number; action: "approve" | "reject"; rejectionReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { applicationId, action, rejectionReason } = body;
  if (!applicationId || !action) {
    return NextResponse.json({ error: "applicationId and action required" }, { status: 400 });
  }

  // Get the application
  const { data: app } = await supabase
    .from("advisor_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.status !== "pending") return NextResponse.json({ error: "Application already processed" }, { status: 400 });

  if (action === "reject") {
    await supabase.from("advisor_applications").update({
      status: "rejected",
      rejection_reason: rejectionReason || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", applicationId);

    sendApplicationRejected(app.email, app.name, rejectionReason).catch((err) => console.error("[admin] rejection email failed:", err));
    return NextResponse.json({ success: true });
  }

  // APPROVE: create professional record
  const slug = `${app.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-")}-${app.location_suburb?.toLowerCase().replace(/[^a-z0-9]/g, "") || "au"}`;

  // Check slug uniqueness
  const { data: existing } = await supabase.from("professionals").select("id").eq("slug", slug).single();
  const finalSlug = existing ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug;

  // Geocode by matching suburb to postcode lookup
  let geoData: { latitude?: number; longitude?: number; location_postcode?: string } = {};
  if (app.location_suburb && app.location_state) {
    const { data: pc } = await supabase
      .from("au_postcodes")
      .select("postcode, latitude, longitude")
      .eq("state", app.location_state)
      .ilike("locality", `%${app.location_suburb}%`)
      .limit(1)
      .single();
    if (pc) {
      geoData = { latitude: pc.latitude, longitude: pc.longitude, location_postcode: pc.postcode };
    }
  }

  const professionalData: Record<string, unknown> = {
    name: app.name,
    slug: finalSlug,
    firm_name: app.firm_name || null,
    email: app.email.toLowerCase().trim(),
    phone: app.phone || null,
    type: app.type,
    afsl_number: app.afsl_number || null,
    registration_number: app.registration_number || null,
    location_state: app.location_state || null,
    location_suburb: app.location_suburb || null,
    location_display: [app.location_suburb, app.location_state].filter(Boolean).join(", ") || null,
    ...geoData,
    specialties: app.specialties ? app.specialties.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    bio: app.bio || null,
    website: app.website || null,
    fee_description: app.fee_description || null,
    initial_consultation_free: true,
    status: "active",
    verified: true,
    rating: 0,
    review_count: 0,
    account_type: app.account_type === "firm" ? "firm_member" : "individual",
    photo_url: app.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.name)}&size=200&background=7c3aed&color=fff`,
  };

  const { data: newPro, error: proError } = await supabase
    .from("professionals")
    .insert(professionalData)
    .select("id")
    .single();

  if (proError) {
    console.error("[admin] create professional failed:", proError);
    return NextResponse.json({ error: "Failed to create advisor profile" }, { status: 500 });
  }

  // If firm application, create the firm too
  let firmId: number | null = null;
  if (app.account_type === "firm" && app.firm_name) {
    const firmSlug = app.firm_name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");
    const { data: newFirm } = await supabase
      .from("advisor_firms")
      .insert({
        name: app.firm_name,
        slug: firmSlug,
        abn: app.abn || null,
        afsl_number: app.afsl_number || null,
        email: app.email,
        phone: app.phone || null,
        website: app.website || null,
        location_state: app.location_state || null,
        location_suburb: app.location_suburb || null,
        location_display: [app.location_suburb, app.location_state].filter(Boolean).join(", ") || null,
        status: "active",
        admin_professional_id: newPro.id,
      })
      .select("id")
      .single();

    if (newFirm) {
      firmId = newFirm.id;
      // Link the professional to the firm
      await supabase.from("professionals").update({ firm_id: firmId, is_firm_admin: true }).eq("id", newPro.id);
    }
  }

  // Update application
  await supabase.from("advisor_applications").update({
    status: "approved",
    professional_id: newPro.id,
    firm_id: firmId,
    reviewed_at: new Date().toISOString(),
  }).eq("id", applicationId);

  // Generate magic link token and send approval email
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await supabase.from("advisor_auth_tokens").insert({
    professional_id: newPro.id,
    token,
    expires_at: expiresAt,
  });

  const loginUrl = `${siteUrl}/advisor-portal?token=${token}`;
  sendApplicationApproved(app.email, app.name, loginUrl).catch((err) => console.error("[admin] approval email failed:", err));

  return NextResponse.json({ success: true, professionalId: newPro.id, firmId });
}
