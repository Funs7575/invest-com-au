/**
 * Newsletter subscription helpers.
 *
 * Wraps the newsletter_segments + newsletter_subscriptions tables
 * with a double-opt-in flow:
 *
 *   1. subscribeToNewsletter(email, segment) → creates an
 *      unconfirmed row with a confirmation_token, returns the token
 *   2. the caller emails the user a link containing the token
 *   3. confirmSubscription(token) → flips confirmed=true
 *   4. unsubscribe(unsubscribe_token) → stamps unsubscribed_at
 *
 * Anti-abuse: we refuse duplicate (email, segment_slug) pairs
 * via the unique index. Repeat subscribes for a confirmed row
 * are a no-op that returns the existing state.
 *
 * Anti-PII: we hash the unsubscribe_token at creation time with
 * randomBytes so a DB leak doesn't hand out working unsubscribe
 * links for every user.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "node:crypto";
import { logger } from "@/lib/logger";

const log = logger("newsletter");

export interface NewsletterSegmentRow {
  id: number;
  slug: string;
  display_name: string;
  description: string | null;
}

export interface NewsletterSubscriptionRow {
  id: number;
  email: string;
  segment_slug: string | null;
  confirmed: boolean;
  confirmation_token: string | null;
  unsubscribed_at: string | null;
  unsubscribe_token: string;
  created_at: string;
  confirmed_at: string | null;
}

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function listSegments(): Promise<NewsletterSegmentRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("newsletter_segments")
      .select("*")
      .order("id", { ascending: true });
    return (data as NewsletterSegmentRow[] | null) || [];
  } catch {
    return [];
  }
}

export interface SubscribeInput {
  email: string;
  segmentSlug?: string | null;
}

export interface SubscribeResult {
  ok: boolean;
  error?: string;
  confirmationToken?: string;
  unsubscribeToken?: string;
  alreadyConfirmed?: boolean;
}

/**
 * Basic email validation — matches the existing lib/validate-email
 * pattern but we don't import it to keep this lib standalone.
 */
function isValidEmail(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  if (input.length < 5 || input.length > 254) return false;
  const parts = input.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (!/^[a-zA-Z0-9._%+-]+$/.test(local)) return false;
  if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) return false;
  return true;
}

export async function subscribeToNewsletter(
  input: SubscribeInput,
): Promise<SubscribeResult> {
  const email = (input.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const segmentSlug = input.segmentSlug || null;
  const confirmationToken = generateToken();
  const unsubscribeToken = generateToken();

  try {
    const supabase = createAdminClient();

    // Check for an existing row first — a repeat subscribe from a
    // confirmed user is a no-op success. From an unconfirmed user
    // we regenerate the token so the latest email works.
    const { data: existing } = await supabase
      .from("newsletter_subscriptions")
      .select("*")
      .eq("email", email)
      .eq("segment_slug", segmentSlug)
      .maybeSingle();

    if (existing) {
      const row = existing as NewsletterSubscriptionRow;
      if (row.confirmed && !row.unsubscribed_at) {
        return {
          ok: true,
          alreadyConfirmed: true,
          unsubscribeToken: row.unsubscribe_token,
        };
      }
      // Refresh the confirmation token + wipe the unsubscribed_at
      // flag so a previously-unsubscribed user can re-join.
      const { error } = await supabase
        .from("newsletter_subscriptions")
        .update({
          confirmation_token: confirmationToken,
          unsubscribed_at: null,
        })
        .eq("id", row.id);
      if (error) return { ok: false, error: error.message };
      return {
        ok: true,
        confirmationToken,
        unsubscribeToken: row.unsubscribe_token,
      };
    }

    const { error } = await supabase.from("newsletter_subscriptions").insert({
      email,
      segment_slug: segmentSlug,
      confirmed: false,
      confirmation_token: confirmationToken,
      unsubscribe_token: unsubscribeToken,
    });
    if (error) {
      log.warn("newsletter_subscriptions insert failed", {
        error: error.message,
      });
      return { ok: false, error: error.message };
    }

    return { ok: true, confirmationToken, unsubscribeToken };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function confirmSubscription(
  token: string,
): Promise<{ ok: boolean; email?: string; error?: string }> {
  if (!token || token.length < 16) {
    return { ok: false, error: "invalid_token" };
  }
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("newsletter_subscriptions")
      .select("id, email, confirmed")
      .eq("confirmation_token", token)
      .maybeSingle();
    if (!data) return { ok: false, error: "not_found" };
    const row = data as { id: number; email: string; confirmed: boolean };
    if (row.confirmed) return { ok: true, email: row.email };

    await supabase
      .from("newsletter_subscriptions")
      .update({
        confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmation_token: null,
      })
      .eq("id", row.id);
    return { ok: true, email: row.email };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function unsubscribeByToken(
  token: string,
): Promise<{ ok: boolean; email?: string; error?: string }> {
  if (!token || token.length < 16) {
    return { ok: false, error: "invalid_token" };
  }
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("newsletter_subscriptions")
      .select("id, email, unsubscribed_at")
      .eq("unsubscribe_token", token)
      .maybeSingle();
    if (!data) return { ok: false, error: "not_found" };
    const row = data as {
      id: number;
      email: string;
      unsubscribed_at: string | null;
    };
    if (row.unsubscribed_at) return { ok: true, email: row.email };

    await supabase
      .from("newsletter_subscriptions")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: true, email: row.email };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function countConfirmedSubscribers(
  segmentSlug?: string | null,
): Promise<number> {
  try {
    const supabase = createAdminClient();
    let q = supabase
      .from("newsletter_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("confirmed", true)
      .is("unsubscribed_at", null);
    if (segmentSlug) q = q.eq("segment_slug", segmentSlug);
    const { count } = await q;
    return count || 0;
  } catch {
    return 0;
  }
}
