import { createClient } from "@/lib/supabase/server";
import { COURSE_SLUG } from "@/lib/course";

/**
 * Server-side: check if user has purchased the course.
 */
export async function hasCourseAccess(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("course_slug", COURSE_SLUG)
    .limit(1)
    .maybeSingle();
  return !!data;
}
