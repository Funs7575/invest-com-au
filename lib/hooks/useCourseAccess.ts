"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";

export function useCourseAccess(courseSlug: string = "investing-101") {
  const { user, loading: userLoading } = useUser();
  const [hasCourse, setHasCourse] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setHasCourse(false);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    (async () => {
      try {
        const { data } = await supabase
          .from("course_purchases")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_slug", courseSlug)
          .limit(1)
          .maybeSingle();
        setHasCourse(!!data);
      } catch {
        setHasCourse(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, userLoading, courseSlug]);

  return { user, hasCourse, loading: loading || userLoading };
}
