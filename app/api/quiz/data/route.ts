import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const runtime = "edge";

// Brokers and quiz_weights are low-churn tables — safe to cache at the CDN
// and browser for 60 s; serve stale for up to 5 min while revalidating.
// This eliminates the client → Supabase round-trip on every quiz load.
const CACHE_SECONDS = 60;
const SWR_SECONDS = 300;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return new Response("Service unavailable", { status: 503 });
  }

  // Use the anon key (not service-role): brokers is public-read via RLS,
  // quiz_weights has no PII and is safe to expose to the anon role.
  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
  });

  const [brokerResult, weightsResult] = await Promise.all([
    supabase
      .from("brokers")
      .select("*")
      .eq("status", "active")
      .order("rating", { ascending: false }),
    supabase.from("quiz_weights").select("*"),
  ]);

  if (brokerResult.error) {
    return new Response(
      JSON.stringify({ error: "Failed to load quiz data" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      brokers: brokerResult.data ?? [],
      quiz_weights: weightsResult.data ?? [],
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=${SWR_SECONDS}`,
      },
    },
  );
}
