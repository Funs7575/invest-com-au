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
    supabase
      .from("course_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_slug", courseSlug)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setHasCourse(!!data);
        setLoading(false);
      })
      .catch(() => {
        setHasCourse(false);
        setLoading(false);
      });
  }, [user, userLoading, courseSlug]);

  return { user, hasCourse, loading: loading || userLoading };
}
