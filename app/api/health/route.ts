import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Lightweight health-check endpoint.
 * Returns 200 if the app + database are reachable, 503 otherwise.
 */
export async function GET() {
  const start = Date.now();

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Simple connectivity check — count is fast and touches the DB
    const { error } = await supabase
      .from("brokers")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json(
      {
        status: "ok",
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        error: err instanceof Error ? err.message : "Unknown error",
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
