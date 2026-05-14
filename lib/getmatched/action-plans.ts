/**
 * Action Plan persistence — anonymous-first, with email-key share tokens
 * and an account-claim path.
 *
 * RLS notes:
 *   - `share_token` reads use admin client (token-keyed access; RLS would
 *     deny anon SELECT without the token-side join).
 *   - Authenticated owner reads go through the table's RLS policy
 *     (`auth.uid() = auth_user_id`), so the API route can use the regular
 *     server client.
 */

// eslint-disable-next-line no-restricted-imports -- anon path: share_token reads + cross-user writes for the claim flow. Service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";

import type {
  ActionPlan,
  ActionPlanAnswers,
  ChecklistItem,
  IntentSlug,
  PlanStatus,
  RouteType,
} from "./types";

const log = logger("getmatched:action-plans");

export function newShareToken(): string {
  return randomBytes(24).toString("hex");
}

export interface CreatePlanInput {
  sessionId: string;
  authUserId?: string | null;
  email?: string | null;
  initialAnswers?: ActionPlanAnswers;
}

export async function createPlan(input: CreatePlanInput): Promise<ActionPlan> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("get_matched_action_plans")
    .insert({
      session_id: input.sessionId,
      auth_user_id: input.authUserId ?? null,
      email: input.email ?? null,
      answers: input.initialAnswers ?? {},
      share_token: newShareToken(),
      status: "draft",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`createPlan failed: ${error?.message ?? "no row"}`);
  }
  return data as ActionPlan;
}

export async function getPlanById(id: number): Promise<ActionPlan | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("get_matched_action_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as ActionPlan) ?? null;
}

export async function getPlanByToken(token: string): Promise<ActionPlan | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("get_matched_action_plans")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  return (data as ActionPlan) ?? null;
}

export interface UpdatePlanInput {
  id: number;
  answers?: ActionPlanAnswers;
  intent_slug?: IntentSlug | null;
  secondary_intent_slug?: IntentSlug | null;
  route?: RouteType | null;
  goal?: string | null;
  checklist?: ChecklistItem[];
  budget_band?: string | null;
  timeline?: string | null;
  location_state?: string | null;
  country_of_residence?: string | null;
  help_needed?: string[];
  risk_flags?: string[];
  risk_severity?: string | null;
  linked_brief_id?: number | null;
  status?: PlanStatus;
  email?: string | null;
  auth_user_id?: string | null;
  meta?: Record<string, unknown>;
}

export async function updatePlan(input: UpdatePlanInput): Promise<ActionPlan> {
  const admin = createAdminClient();
  const { id, ...patch } = input;
  const updates = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  );
  if (Object.keys(updates).length === 0) {
    const existing = await getPlanById(id);
    if (!existing) throw new Error("plan_not_found");
    return existing;
  }
  const { data, error } = await admin
    .from("get_matched_action_plans")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`updatePlan failed: ${error?.message ?? "no row"}`);
  }
  return data as ActionPlan;
}

export interface ClaimPlanInput {
  planId: number;
  authUserId: string;
  email?: string;
}

export async function claimPlanForUser({
  planId,
  authUserId,
  email,
}: ClaimPlanInput): Promise<ActionPlan> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("get_matched_action_plans")
    .update({
      auth_user_id: authUserId,
      email: email ?? null,
      status: "saved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .is("auth_user_id", null)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`claimPlanForUser failed: ${error.message}`);
  if (!data) {
    // Race: someone else already claimed it. Return the current state.
    const current = await getPlanById(planId);
    if (!current) throw new Error("plan_not_found");
    return current;
  }
  log.info("Plan claimed by user", { planId, authUserId });
  return data as ActionPlan;
}

export async function listPlansForUser(authUserId: string): Promise<ActionPlan[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("get_matched_action_plans")
    .select("*")
    .eq("auth_user_id", authUserId)
    .order("updated_at", { ascending: false })
    .limit(50);
  return (data as ActionPlan[]) ?? [];
}

export async function linkBriefToPlan(
  planId: number,
  briefId: number,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("get_matched_action_plans")
    .update({
      linked_brief_id: briefId,
      status: "converted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);
  await admin
    .from("advisor_auctions")
    .update({ linked_action_plan_id: planId })
    .eq("id", briefId);
}

export function toggleChecklistItem(
  checklist: ChecklistItem[],
  index: number,
): ChecklistItem[] {
  return checklist.map((item, i) =>
    i === index ? { ...item, done: !item.done } : item,
  );
}
