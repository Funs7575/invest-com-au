import { createClient } from "@/lib/supabase/server";

/**
 * Database-backed rate limiter that survives serverless cold starts.
 * Returns true if the request should be blocked.
 */
export async function isRateLimited(
  key: string,
  maxRequests: number = 10,
  windowMinutes: number = 60
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    // Try to get existing entry
    const { data: existing } = await supabase
      .from("rate_limits")
      .select("count, window_start")
      .eq("key", key)
      .single();

    if (!existing) {
      // First request — create entry
      await supabase.from("rate_limits").upsert({ key, count: 1, window_start: new Date().toISOString() }, { onConflict: "key" });
      return false;
    }

    // Check if window has expired
    if (new Date(existing.window_start) < new Date(windowStart)) {
      // Reset window
      await supabase.from("rate_limits").update({ count: 1, window_start: new Date().toISOString() }).eq("key", key);
      return false;
    }

    // Increment count
    const newCount = (existing.count || 0) + 1;
    await supabase.from("rate_limits").update({ count: newCount }).eq("key", key);

    return newCount > maxRequests;
  } catch {
    // If rate limiting fails, allow the request (fail open)
    return false;
  }
}
