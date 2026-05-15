/**
 * Pro affiliate program — share-link CRUD.
 *
 * One row in `pro_affiliate_links` per (pro_slug, pro_kind). The
 * `share_token` is the public-facing handle stamped into the LinkedIn
 * URL. We use a 10-char alphabet-restricted nanoid-style token so the
 * URL stays short ("invest.com.au/p/A7kB29wXyz") and copy-paste-clean
 * (no `+`, `/`, or `=` chars that some social hosts mishandle).
 */

// eslint-disable-next-line no-restricted-imports -- service-role legitimate per CLAUDE.md: pro_affiliate_links has deny-all-anon RLS; getOrCreateLink runs from server-side helpers (page render, admin) with no authenticated user JWT carrying the right slug; also writes the auto-incrementing counters during fire-and-forget click ingest.
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "node:crypto";

import { logger } from "@/lib/logger";

import type { ProAffiliateLink, ProKind } from "./types";

const log = logger("pro-affiliate:links");

/** url-safe alphabet (62 chars). 10 chars ⇒ ~59 bits of entropy. */
const TOKEN_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const TOKEN_LENGTH = 10;

function generateShareToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  let out = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    const byte = bytes[i] ?? 0;
    const idx = byte % TOKEN_ALPHABET.length;
    out += TOKEN_ALPHABET.charAt(idx);
  }
  return out;
}

export interface GetOrCreateLinkInput {
  proSlug: string;
  proKind: ProKind;
}

/**
 * Idempotent — returns the existing row for (pro_slug, pro_kind) or
 * inserts and returns a freshly minted one. Collisions on `share_token`
 * are exceedingly unlikely at 59 bits, but if they happen the insert
 * fails with a 23505 conflict and the caller retries; we cap at 3.
 */
export async function getOrCreateLink({
  proSlug,
  proKind,
}: GetOrCreateLinkInput): Promise<ProAffiliateLink | null> {
  const admin = createAdminClient();

  // Idempotent fast path — return existing row.
  const { data: existing } = await admin
    .from("pro_affiliate_links")
    .select("*")
    .eq("pro_slug", proSlug)
    .eq("pro_kind", proKind)
    .maybeSingle();
  if (existing) return existing as unknown as ProAffiliateLink;

  // Insert with retry on share_token UNIQUE collision (Postgres 23505).
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateShareToken();
    const { data, error } = await admin
      .from("pro_affiliate_links")
      .insert({
        pro_slug: proSlug,
        pro_kind: proKind,
        share_token: token,
      })
      .select("*")
      .single();

    if (!error && data) return data as unknown as ProAffiliateLink;

    // Race: another concurrent caller inserted the same (pro_slug, pro_kind)
    // pair. Re-read and return that row instead.
    if (error?.code === "23505") {
      const { data: raced } = await admin
        .from("pro_affiliate_links")
        .select("*")
        .eq("pro_slug", proSlug)
        .eq("pro_kind", proKind)
        .maybeSingle();
      if (raced) return raced as unknown as ProAffiliateLink;
      // Token collision against a different (pro_slug, pro_kind) — retry.
      continue;
    }

    log.error("getOrCreateLink insert failed", {
      proSlug,
      proKind,
      error: error?.message,
    });
    return null;
  }

  log.error("getOrCreateLink: exhausted retries on token collision", {
    proSlug,
    proKind,
  });
  return null;
}

export async function getLinkByToken(
  token: string,
): Promise<ProAffiliateLink | null> {
  if (!token) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("pro_affiliate_links")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  return (data as unknown as ProAffiliateLink | null) ?? null;
}
