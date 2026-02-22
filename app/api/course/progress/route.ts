import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const lessonId = body.lesson_id;
    const courseSlug = body.course_slug || "investing-101";

    if (!lessonId || typeof lessonId !== "number") {
      return NextResponse.json(
        { error: "lesson_id is required" },
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
      console.error("Progress upsert error:", error.message);
      return NextResponse.json(
        { error: "Failed to save progress" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Course progress error:", err);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
