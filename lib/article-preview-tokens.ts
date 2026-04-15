/**
 * Signed draft preview tokens.
 *
 * Generates url-safe random tokens that map to an article slug
 * + expiry. The public route at /preview/[token] resolves the
 * token, checks expiry + revocation, and renders the draft if
 * valid — so a writer can share a draft with a reviewer or
 * subject-matter expert without giving them admin access.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "node:crypto";
import { logger } from "@/lib/logger";

const log = logger("article-preview-tokens");

export interface PreviewTokenRow {
  id: number;
  token: string;
  article_slug: string;
  created_by: string;
  note: string | null;
  expires_at: string;
  revoked_at: string | null;
  opened_count: number;
  last_opened_at: string | null;
  created_at: string;
}

/** 32 url-safe chars. 192 bits of entropy, plenty for a share-link. */
function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export interface CreateTokenInput {
  articleSlug: string;
  createdBy: string;
  ttlHours?: number;
  note?: string | null;
}

export async function createPreviewToken(
  input: CreateTokenInput,
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const ttlHours = input.ttlHours || 72;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  const token = generateToken();

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("article_preview_tokens").insert({
      token,
      article_slug: input.articleSlug,
      created_by: input.createdBy,
      note: input.note || null,
      expires_at: expiresAt,
    });
    if (error) {
      log.warn("article_preview_tokens insert failed", { error: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true, token };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Resolve a token to a draft article. Returns null on any failure
 * — expired, revoked, not found, or DB error. Caller should render
 * a 404 in every null case (don't leak which reason).
 */
export async function resolvePreviewToken(
  token: string,
): Promise<{ slug: string } | null> {
  if (!token || typeof token !== "string" || token.length < 16) return null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("article_preview_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (!data) return null;

    const row = data as PreviewTokenRow;
    const now = Date.now();
    if (row.revoked_at) return null;
    if (new Date(row.expires_at).getTime() <= now) return null;

    // Bump the open counter — fire-and-forget, don't block render
    supabase
      .from("article_preview_tokens")
      .update({
        opened_count: (row.opened_count || 0) + 1,
        last_opened_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .then(() => {}, () => {});

    return { slug: row.article_slug };
  } catch (err) {
    log.warn("resolvePreviewToken threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function revokePreviewToken(
  tokenId: number,
): Promise<{ ok: boolean }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("article_preview_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", tokenId);
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

export async function listTokensForArticle(
  articleSlug: string,
): Promise<PreviewTokenRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("article_preview_tokens")
      .select("*")
      .eq("article_slug", articleSlug)
      .order("created_at", { ascending: false });
    return (data as PreviewTokenRow[] | null) || [];
  } catch {
    return [];
  }
}
