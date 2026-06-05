import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Broker } from "@/lib/types";
import { stripInternalBrokerFields } from "@/lib/brokers/sanitize";

export const runtime = "edge";

// Brokers are low-churn — safe to cache at the CDN and browser for 60 s; serve
// stale for up to 5 min while revalidating. This eliminates the client →
// Supabase round-trip on every quiz load.
//
// `quiz_weights` is no longer returned here: scoring moved server-side to
// POST /api/quiz/score so the tuned ranking weights never reach the browser.
// This route now only serves the broker display data the quiz UI renders.
const CACHE_SECONDS = 60;
const SWR_SECONDS = 300;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return new Response("Service unavailable", { status: 503 });
  }

  // Use the anon key (not service-role): brokers is public-read via RLS.
  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
  });

  const brokerResult = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .order("rating", { ascending: false });

  if (brokerResult.error) {
    return new Response(
      JSON.stringify({ error: "Failed to load quiz data" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // Strip internal commercial/affiliate-economics columns — `select("*")`
  // pulls them in, but they must never reach the browser.
  const brokers = (brokerResult.data ?? []).map((b) =>
    stripInternalBrokerFields(b as unknown as Broker),
  );

  return new Response(
    JSON.stringify({ brokers }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=${SWR_SECONDS}`,
      },
    },
  );
}
