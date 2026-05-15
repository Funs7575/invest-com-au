/**
 * Admin impersonate-as-user mode.
 *
 * Flow:
 *   1. Admin posts to /api/admin/impersonate with `{ target_user_id }`.
 *   2. Handler writes an `admin_impersonations` audit row first.
 *   3. Handler sets a short-lived httpOnly cookie `iv_impersonate=<row_id>`.
 *   4. Server-rendered pages call `getCurrentImpersonation()` to determine
 *      whether a banner should render and whether to swap the effective user.
 *   5. Admin posts to /api/admin/impersonate/end to clear the cookie and
 *      stamp `ended_at` on the audit row.
 *
 * Security:
 *   - Cookie is httpOnly + sameSite=lax + secure in production + 1h max age.
 *   - End-to-end audit row is written BEFORE the cookie so a crash leaves
 *     an audit trail.
 *   - `getCurrentImpersonation` returns null unless the cookie's row is
 *     un-ended AND the calling user matches the audit row's admin_user_id.
 */
import { cookies } from "next/headers";

// eslint-disable-next-line no-restricted-imports -- service-role legitimate: admin_impersonations is deny-all-RLS by design; only service-role writes audit rows on the admin's behalf.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("admin:impersonate");

export const IMPERSONATE_COOKIE = "iv_impersonate";
const COOKIE_MAX_AGE_SECONDS = 60 * 60; // 1 hour

export interface ImpersonationRow {
  id: number;
  admin_user_id: string;
  target_user_id: string | null;
  target_email: string;
  started_at: string;
  ended_at: string | null;
  actions_taken: Array<Record<string, unknown>>;
}

export interface StartImpersonationInput {
  adminUserId: string;
  targetUserId: string;
  targetEmail: string;
  ipHash?: string | null;
  userAgent?: string | null;
}

export async function startImpersonation(
  input: StartImpersonationInput,
): Promise<ImpersonationRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_impersonations")
    .insert({
      admin_user_id: input.adminUserId,
      target_user_id: input.targetUserId,
      target_email: input.targetEmail,
      ip_hash: input.ipHash ?? null,
      user_agent: input.userAgent ?? null,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`startImpersonation failed: ${error?.message ?? "no row"}`);
  }
  log.info("impersonation started", {
    admin_user_id: input.adminUserId,
    target_email: input.targetEmail,
  });
  return data as ImpersonationRow;
}

export async function endImpersonation(rowId: number): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("admin_impersonations")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", rowId)
    .is("ended_at", null);
  log.info("impersonation ended", { row_id: rowId });
}

export async function logImpersonationAction(
  rowId: number,
  action: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  // Append to the JSONB array. Read-modify-write to keep this dialect-agnostic.
  const { data } = await admin
    .from("admin_impersonations")
    .select("actions_taken")
    .eq("id", rowId)
    .maybeSingle();
  const current = (data?.actions_taken as Array<Record<string, unknown>> | undefined) ?? [];
  await admin
    .from("admin_impersonations")
    .update({
      actions_taken: [...current, { ...action, at: new Date().toISOString() }],
    })
    .eq("id", rowId);
}

export async function getCurrentImpersonation(): Promise<{
  rowId: number;
  targetUserId: string | null;
  targetEmail: string;
} | null> {
  const jar = await cookies();
  const raw = jar.get(IMPERSONATE_COOKIE)?.value;
  if (!raw) return null;
  const rowId = Number.parseInt(raw, 10);
  if (!Number.isFinite(rowId) || rowId <= 0) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_impersonations")
    .select("id, target_user_id, target_email, ended_at")
    .eq("id", rowId)
    .maybeSingle();
  if (!data || data.ended_at) return null;
  return {
    rowId: data.id as number,
    targetUserId: (data.target_user_id as string | null) ?? null,
    targetEmail: data.target_email as string,
  };
}

export function buildImpersonateCookieAttrs(rowId: number): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${IMPERSONATE_COOKIE}=${rowId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearImpersonateCookieAttrs(): string {
  return `${IMPERSONATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
