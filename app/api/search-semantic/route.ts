import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/embeddings";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("search-semantic");

export const runtime = "nodejs";

/**
 * GET /api/search-semantic?q=...&type=article&limit=10
 *
 * Cosine-similarity search across `search_embeddings`. Embeds the
 * user query at request time (one OpenAI call) and runs a pgvector
 * nearest-neighbour query.
 *
 * Query params:
 *   q     — required, the user's query string (min 2 chars, max 200)
 *   type  — optional, filters to a document_type:
 *           'article' | 'broker' | 'advisor' | 'qa' | 'scenario'
 *   limit — optional, 1..20, default 10
 *
 * Rate limit: 30 requests / min per IP. Semantic search is one
 * embedding call + one DB scan, more expensive than keyword.
 *
 * Returns:
 *   { hits: Array<{ type, id, title, excerpt, score }> }
 *
 * Notes on the scoring: pgvector's `<=>` operator returns cosine
 * DISTANCE (smaller is better). We convert to similarity
 * (1 - distance) so the API returns "higher is better" scores.
 */
const MAX_QUERY_LEN = 200;
const MIN_QUERY_LEN = 2;
const ALLOWED_TYPES = new Set(["article", "broker", "advisor", "qa", "scenario"]);

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  const type = request.nextUrl.searchParams.get("type") || "";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "10");
  const limit = Math.min(20, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 10));

  if (q.length < MIN_QUERY_LEN) {
    return NextResponse.json({ hits: [], error: "Query too short" }, { status: 400 });
  }
  if (q.length > MAX_QUERY_LEN) {
    return NextResponse.json({ hits: [], error: "Query too long" }, { status: 400 });
  }
  if (type && !ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ hits: [], error: "Unknown type" }, { status: 400 });
  }

  if (!(await isAllowed("search_semantic", ipKey(request), { max: 30, refillPerSec: 30 / 60 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Embed the query
  const embedding = await embedText(q);
  if (!embedding) {
    log.warn("embedText returned null — falling back to empty results");
    return NextResponse.json({ hits: [], degraded: true });
  }

  // pgvector cosine distance search. We call a postgres function
  // (`search_embeddings_knn`) that wraps the ORDER BY <=> so we
  // don't have to stringify the vector parameter client-side.
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("search_embeddings_knn", {
    query_embedding: embedding.vector,
    match_limit: limit,
    match_type: type || null,
  });

  if (error) {
    log.warn("search_embeddings_knn rpc failed", { error: error.message });
    return NextResponse.json({ hits: [], error: "search_failed", degraded: true });
  }

  const hits = (data || []).map(
    (row: {
      document_type: string;
      document_id: string;
      title: string | null;
      body_excerpt: string | null;
      distance: number;
    }) => ({
      type: row.document_type,
      id: row.document_id,
      title: row.title || "",
      excerpt: row.body_excerpt || "",
      score: Math.max(0, 1 - (row.distance || 0)), // cosine similarity 0..1
    }),
  );

  return NextResponse.json({ hits, provider: embedding.provider });
}
