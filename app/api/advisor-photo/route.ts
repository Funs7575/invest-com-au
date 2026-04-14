import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isAllowed } from "@/lib/rate-limit-db";
import { moderatePhoto } from "@/lib/photo-moderation";

const log = logger("advisor-photo");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function getAdvisorFromSession(request: NextRequest) {
  const sessionToken = request.cookies.get("advisor_session")?.value;
  if (!sessionToken) return null;

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("session_token", sessionToken)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) return null;

  const { data: advisor } = await supabase
    .from("professionals")
    .select("id, slug")
    .eq("id", session.professional_id)
    .single();

  return advisor;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const advisor = await getAdvisorFromSession(request);
    if (!advisor) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit: 10 uploads/hour per advisor — prevents abuse of
    // Supabase storage + photo-moderation credits.
    if (!(await isAllowed("advisor_photo", `a:${advisor.id}`, { max: 10, refillPerSec: 10 / 3600 }))) {
      return NextResponse.json({ error: "Too many uploads — try again later" }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const slug = formData.get("slug") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Verify the slug matches the authenticated advisor
    if (slug !== advisor.slug) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Use admin client for storage operations (bypasses RLS)
    const adminSupabase = createAdminClient();

    // Build storage path: advisor-photos/{slug}/{timestamp}.{ext}
    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const timestamp = Date.now();
    const storagePath = `${advisor.slug}/${timestamp}.${ext}`;

    // Delete any existing photos for this advisor (clean up old files)
    const { data: existingFiles } = await adminSupabase.storage
      .from("advisor-photos")
      .list(advisor.slug);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${advisor.slug}/${f.name}`);
      await adminSupabase.storage.from("advisor-photos").remove(filesToDelete);
    }

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await adminSupabase.storage
      .from("advisor-photos")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      log.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = adminSupabase.storage
      .from("advisor-photos")
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // ── Photo moderation check ──────────────────────────────────
    // If a moderation provider is configured, run the freshly-uploaded
    // image through it. A 'rejected' verdict means we delete the file
    // immediately and return 400 so the advisor can try a different
    // photo. 'flagged' / 'unknown' pass through (admin can review in
    // the audit log). No-provider installs skip this check entirely.
    const moderation = await moderatePhoto(publicUrl, "advisor_photo", advisor.id);
    if (moderation.verdict === "rejected") {
      await adminSupabase.storage.from("advisor-photos").remove([storagePath]);
      log.warn("Rejected uploaded advisor photo as explicit", {
        advisorId: advisor.id,
        provider: moderation.provider,
        confidence: moderation.confidence,
      });
      return NextResponse.json(
        { error: "Photo rejected by content moderation. Please use a different image." },
        { status: 400 },
      );
    }

    // Update professionals row with the new photo_url
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from("professionals")
      .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", advisor.id);

    if (updateError) {
      log.error("Profile update error:", updateError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ publicUrl, moderation: moderation.verdict });
  } catch (error) {
    log.error("Photo upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
