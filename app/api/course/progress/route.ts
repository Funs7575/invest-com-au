import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { issueCertificate } from "@/lib/course-certificates";

const log = logger("course");

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // eslint-disable-next-line invest/no-unvalidated-req-json -- fields are validated individually below (lesson_id: number, course_slug: string)
    const body = await request.json();
    const lessonId = body.lesson_id;
    const courseSlug = body.course_slug;

    if (!lessonId || typeof lessonId !== "number") {
      return NextResponse.json(
        { error: "lesson_id is required" },
        { status: 400 }
      );
    }

    if (!courseSlug || typeof courseSlug !== "string") {
      return NextResponse.json(
        { error: "course_slug is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify user has purchased this specific course
    const { data: purchase } = await admin
      .from("course_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_slug", courseSlug)
      .limit(1)
      .maybeSingle();

    if (!purchase) {
      return NextResponse.json(
        { error: "Course not purchased" },
        { status: 403 }
      );
    }

    // Upsert progress (idempotent — marking complete twice is fine)
    const { error } = await admin
      .from("course_progress")
      .upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" }
      );

    if (error) {
      log.error("Progress upsert error", { error: error.message });
      return NextResponse.json(
        { error: "Failed to save progress" },
        { status: 500 }
      );
    }

    // Check if all lessons for this course are now complete → issue certificate
    let certificateIssued = false;
    try {
      const cert = await issueCertificate(user.id, courseSlug, (purchase as { id: number }).id ?? null);
      certificateIssued = cert !== null;
      if (certificateIssued) {
        log.info("Certificate issued on course completion", {
          userId: user.id,
          courseSlug,
          certificateNumber: cert?.certificate_number,
        });
      }
    } catch (certErr) {
      // Non-fatal: progress was saved; certificate issuance failure is logged only
      log.error("Certificate issuance error", {
        error: certErr instanceof Error ? certErr.message : String(certErr),
        userId: user.id,
        courseSlug,
      });
    }

    return NextResponse.json({ success: true, certificateIssued });
  } catch (err) {
    log.error("Course progress error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
