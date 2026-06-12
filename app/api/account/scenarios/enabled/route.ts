/**
 * GET /api/account/scenarios/enabled — is the Scenario Workspace flag on?
 *
 * Lets the client-side <ScenarioBar> self-gate on the `scenario_workspace`
 * feature flag without threading a server-resolved value through every
 * calculator page (which would force those ISR pages dynamic). Returns only the
 * boolean — no auth required, no PII. Fails closed: any error ⇒ { enabled: false }.
 */

import { NextResponse } from "next/server";
import { isFlagEnabled } from "@/lib/feature-flags";
import { SCENARIO_WORKSPACE_FLAG } from "@/lib/scenarios";

export const runtime = "nodejs";

export async function GET() {
  try {
    const enabled = await isFlagEnabled(SCENARIO_WORKSPACE_FLAG);
    return NextResponse.json({ enabled });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
