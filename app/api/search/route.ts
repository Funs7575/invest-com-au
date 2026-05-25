import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";
import { searchAll, sanitiseQuery } from "@/lib/search";
import { logger } from "@/lib/logger";

const log = logger("search");

// Validate query params — GET requests use URL params, not body.
// Zod parses from searchParams so we validate before any DB call.
const QuerySchema = z.object({
  q: z.string().min(2, "Query must be at least 2 characters").max(200),
  // Optional per-category caps for the /search page (overlay uses defaults)
  brokers: z.coerce.number().int().min(1).max(20).optional(),
  advisors: z.coerce.number().int().min(1).max(20).optional(),
  articles: z.coerce.number().int().min(1).max(20).optional(),
  glossary: z.coerce.number().int().min(1).max(20).optional(),
  tools: z.coerce.number().int().min(1).max(10).optional(),
});

/**
 * GET /api/search?q=<query>
 *
 * Returns categorised search results across brokers, advisors, articles,
 * glossary terms, and tools. Results are factual lookups only — AFSL-safe.
 *
 * Rate limit: 60 requests / min per IP (generous for debounced overlay)
 *
 * Response:
 *   {
 *     brokers: Array<{ slug, name, tagline }>
 *     advisors: Array<{ slug, name, type, location_display, firm_name }>
 *     articles: Array<{ slug, title, excerpt, category }>
 *     glossary: Array<{ slug, term, definition, category }>
 *     tools:    Array<{ slug, title, description, href }>
 *     durationMs: number
 *   }
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (await isRateLimited(`search:${ip}`, 60, 1)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const raw: Record<string, string> = {};
  for (const [k, v] of request.nextUrl.searchParams.entries()) {
    raw[k] = v;
  }

  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Invalid query", code: "validation_error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { q, ...capOverrides } = parsed.data;
  const sanitised = sanitiseQuery(q);

  if (sanitised.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  try {
    const results = await searchAll(sanitised, capOverrides);

    log.info("search completed", { q: sanitised, durationMs: results.durationMs });

    return NextResponse.json(results, {
      headers: {
        // Short-lived cache: overlay queries are user-specific but results are
        // public data. 60s stale-while-revalidate keeps infra costs low while
        // still returning near-fresh broker/article data.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    log.error("search error", { err: err instanceof Error ? err.message : String(err), q: sanitised });
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
