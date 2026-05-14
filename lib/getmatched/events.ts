/**
 * Get Matched funnel analytics — fire-and-forget event ingestion.
 *
 * The admin `/admin/funnel` view aggregates these rows. Failures must NEVER
 * block the user experience.
 */

// eslint-disable-next-line no-restricted-imports -- anon path: events are inserted from the public flow.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("getmatched:events");

export type GmEventType =
  | "started"
  | "question_answered"
  | "question_abandoned"
  | "plan_shown"
  | "cta_clicked"
  | "plan_saved"
  | "account_created"
  | "brief_drafted"
  | "brief_submitted"
  | "risk_flagged";

export interface LogEventInput {
  sessionId: string;
  authUserId?: string | null;
  eventType: GmEventType;
  step?: number | null;
  payload?: Record<string, unknown>;
  sourcePage?: string | null;
  userAgent?: string | null;
}

export async function logEvent(input: LogEventInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("get_matched_events").insert({
      session_id: input.sessionId,
      auth_user_id: input.authUserId ?? null,
      event_type: input.eventType,
      step: input.step ?? null,
      payload: input.payload ?? {},
      source_page: input.sourcePage ?? null,
      user_agent: input.userAgent ?? null,
    });
  } catch (err) {
    log.warn("logEvent failed (ignored)", {
      err: err instanceof Error ? err.message : String(err),
      eventType: input.eventType,
    });
  }
}
