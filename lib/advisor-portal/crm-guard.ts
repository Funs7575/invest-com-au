/**
 * Shared gate for the Follow-Up Autopilot CRM API routes.
 *
 * Every route does the same three checks in the same order:
 *   1. feature flag (`lead_sequences`) — fail-closed; off ⇒ the feature does
 *      not exist, so we 404 (not 403) to avoid advertising a disabled surface.
 *   2. advisor session — resolves the caller's professional_id (or 401).
 *
 * Returns either a NextResponse to short-circuit with, or the resolved
 * professionalId for the handler to scope all queries by.
 */

import { NextResponse, type NextRequest } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isFlagEnabled } from "@/lib/feature-flags";
import { LEAD_SEQUENCES_FLAG } from "@/lib/advisor-portal/crm-constants";

export type CrmGuardResult =
  | { ok: true; professionalId: number }
  | { ok: false; response: NextResponse };

export async function guardCrmRequest(req: NextRequest): Promise<CrmGuardResult> {
  // Flag first — a disabled feature should look absent, and the flag read is
  // cheaper than a session round-trip.
  const enabled = await isFlagEnabled(LEAD_SEQUENCES_FLAG);
  if (!enabled) {
    return { ok: false, response: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  }

  const professionalId = await requireAdvisorSession(req);
  if (!professionalId) {
    return { ok: false, response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }

  return { ok: true, professionalId };
}
