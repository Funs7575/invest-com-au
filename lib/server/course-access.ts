import { createClient } from "@/lib/supabase/server";

/**
 * Server-side: check if user has purchased a specific course.
 */
export async function hasCourseAccess(
  userId: string,
  courseSlug: string = "investing-101"
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("course_slug", courseSlug)
    .limit(1)
    .maybeSingle();
  return !!data;
}
