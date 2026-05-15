/**
 * Investor referral program — consumers share `/ref/<token>` links to bring
 * other investors. Signup/brief events award credits to the referrer. Mirror
 * of `lib/pro-affiliate/*` but for `auth.users` (no professional row needed).
 */
import { randomBytes } from "node:crypto";

// eslint-disable-next-line no-restricted-imports -- writes on the caller's behalf during attribution events that don't carry the user's JWT (cron / webhook); RLS authenticated SELECT-policy preserved for owner reads.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("investor-referrals");

export type ReferralEvent = "signup" | "brief_created" | "brief_accepted";

const CREDITS_BY_EVENT: Record<ReferralEvent, number> = {
  signup: 5,
  brief_created: 10,
  brief_accepted: 25,
};

export function getCreditAwardForEvent(event: ReferralEvent): number {
  return CREDITS_BY_EVENT[event];
}

function generateToken(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L
  const buf = randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += alphabet[buf[i]! % alphabet.length];
  }
  return s;
}

export interface InvestorReferralLink {
  id: number;
  auth_user_id: string;
  share_token: string;
  click_count: number;
  signup_count: number;
  brief_count: number;
}

export async function getOrCreateLink(
  authUserId: string,
): Promise<InvestorReferralLink> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("investor_referral_links")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (existing) return existing as InvestorReferralLink;

  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateToken();
    const { data, error } = await admin
      .from("investor_referral_links")
      .insert({ auth_user_id: authUserId, share_token: token })
      .select("*")
      .single();
    if (data) return data as InvestorReferralLink;
    if (error?.code !== "23505") {
      throw new Error(`getOrCreateLink failed: ${error?.message}`);
    }
  }
  throw new Error("getOrCreateLink: token collision retries exhausted");
}

export async function getLinkByToken(
  token: string,
): Promise<InvestorReferralLink | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("investor_referral_links")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  return (data as InvestorReferralLink | null) ?? null;
}

export async function recordClick(token: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("investor_referral_links")
    .select("id, click_count")
    .eq("share_token", token)
    .maybeSingle();
  if (!data) return;
  await admin
    .from("investor_referral_links")
    .update({
      click_count: (data.click_count as number) + 1,
      last_clicked_at: new Date().toISOString(),
    })
    .eq("id", data.id as number);
}

export async function awardCredits(input: {
  authUserId: string;
  event: ReferralEvent;
  attributedUserId?: string | null;
  attributedBriefId?: number | null;
}): Promise<void> {
  const credits = getCreditAwardForEvent(input.event);
  const admin = createAdminClient();
  await admin.from("investor_referral_credits").insert({
    auth_user_id: input.authUserId,
    source_event: input.event,
    credits_awarded: credits,
    attributed_user_id: input.attributedUserId ?? null,
    attributed_brief_id: input.attributedBriefId ?? null,
  });
  // Bump the counter on the link too.
  const column =
    input.event === "signup"
      ? "signup_count"
      : input.event === "brief_created"
        ? "brief_count"
        : null;
  if (column) {
    const { data: link } = await admin
      .from("investor_referral_links")
      .select(`id, ${column}`)
      .eq("auth_user_id", input.authUserId)
      .maybeSingle();
    if (link) {
      const linkRow = link as Record<string, unknown> & { id: number };
      const current = (linkRow[column] as number | null) ?? 0;
      await admin
        .from("investor_referral_links")
        .update({ [column]: current + 1 })
        .eq("id", linkRow.id);
    }
  }
  log.info("credits awarded", {
    auth_user_id: input.authUserId,
    event: input.event,
    credits,
  });
}
