import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { embedBatch, selectEmbeddingProvider } from "@/lib/embeddings";

const log = logger("cron:embeddings-refresh");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Hourly cron that keeps `search_embeddings` up to date.
 *
 * Strategy:
 *
 *   1. For each source type (article, broker, advisor, qa), find
 *      rows whose source_updated_at is newer than the existing
 *      embedding's source_updated_at (or who have no embedding at
 *      all).
 *   2. Batch embed up to EMBED_BATCH_LIMIT rows per run.
 *   3. Upsert into search_embeddings with the new vector.
 *
 * This keeps the cost bounded — a sudden bulk edit triggers
 * catch-up over several hours rather than one giant run. If no
 * embedding provider is configured the cron still runs but
 * populates with stub vectors so search works in local dev.
 */
const EMBED_BATCH_LIMIT = 200;

async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("embeddings_refresh")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const provider = selectEmbeddingProvider();
  const stats = {
    provider,
    articles: 0,
    brokers: 0,
    advisors: 0,
    failed: 0,
  };

  // ── Articles ──
  const { data: articles } = await supabase
    .from("articles")
    .select("id, slug, title, excerpt, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(EMBED_BATCH_LIMIT);

  const articleInputs = (articles || []).map((a) => ({
    document_type: "article",
    document_id: a.slug as string,
    title: a.title as string,
    body_excerpt: ((a.excerpt as string) || "").slice(0, 500),
    source_updated_at: a.updated_at as string,
    embed_text: `${a.title}\n\n${(a.excerpt as string) || ""}`,
  }));
  stats.articles = await upsertEmbeddings(supabase, articleInputs);

  // ── Brokers ──
  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, slug, name, tagline, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(EMBED_BATCH_LIMIT);

  const brokerInputs = (brokers || []).map((b) => ({
    document_type: "broker",
    document_id: b.slug as string,
    title: b.name as string,
    body_excerpt: ((b.tagline as string) || "").slice(0, 500),
    source_updated_at: b.updated_at as string,
    embed_text: `${b.name}\n\n${(b.tagline as string) || ""}`,
  }));
  stats.brokers = await upsertEmbeddings(supabase, brokerInputs);

  // ── Advisors ──
  const { data: advisors } = await supabase
    .from("professionals")
    .select("id, slug, name, firm_name, bio, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(EMBED_BATCH_LIMIT);

  const advisorInputs = (advisors || []).map((a) => ({
    document_type: "advisor",
    document_id: a.slug as string,
    title: `${a.name}${a.firm_name ? " — " + a.firm_name : ""}`,
    body_excerpt: ((a.bio as string) || "").slice(0, 500),
    source_updated_at: a.updated_at as string,
    embed_text: `${a.name}\n${a.firm_name || ""}\n\n${(a.bio as string) || ""}`,
  }));
  stats.advisors = await upsertEmbeddings(supabase, advisorInputs);

  log.info("embeddings refresh completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

type AdminClient = ReturnType<typeof createAdminClient>;

interface EmbeddingInput {
  document_type: string;
  document_id: string;
  title: string;
  body_excerpt: string;
  source_updated_at: string;
  embed_text: string;
}

async function upsertEmbeddings(
  supabase: AdminClient,
  inputs: EmbeddingInput[],
): Promise<number> {
  if (inputs.length === 0) return 0;

  // Fetch existing rows so we can skip ones whose source hasn't
  // advanced — keeps the OpenAI bill proportional to real changes.
  const ids = inputs.map((i) => i.document_id);
  const type = inputs[0].document_type;
  const { data: existing } = await supabase
    .from("search_embeddings")
    .select("document_id, source_updated_at")
    .eq("document_type", type)
    .in("document_id", ids);
  const existingMap = new Map(
    (existing || []).map((e) => [e.document_id as string, e.source_updated_at as string | null]),
  );

  const dirty = inputs.filter((i) => {
    const prev = existingMap.get(i.document_id);
    if (!prev) return true;
    return new Date(i.source_updated_at).getTime() > new Date(prev).getTime();
  });
  if (dirty.length === 0) return 0;

  const vectors = await embedBatch(dirty.map((d) => d.embed_text));
  const rows = dirty
    .map((d, i) => {
      const v = vectors[i];
      if (!v) return null;
      return {
        document_type: d.document_type,
        document_id: d.document_id,
        title: d.title,
        body_excerpt: d.body_excerpt,
        embedding: v.vector as unknown as string, // pgvector accepts array literal; supabase-js stringifies
        model: v.model,
        source_updated_at: d.source_updated_at,
        embedded_at: new Date().toISOString(),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from("search_embeddings")
    .upsert(rows, { onConflict: "document_type,document_id" });

  if (error) {
    log.warn("search_embeddings upsert failed", { error: error.message });
    return 0;
  }
  return rows.length;
}

export const GET = wrapCronHandler("embeddings-refresh", handler);
