/**
 * Typed client for /api/submit-lead.
 *
 * KK-01: replaces the three raw `fetch("/api/submit-lead", ...)` calls
 * scattered across find-advisor/page.tsx and HubLeadForm.tsx with a
 * single typed wrapper. Source variant is captured in `source_page` and
 * flows through to PostHog analytics and the leads table.
 *
 * The `website` honeypot field is excluded from the public type so callers
 * cannot accidentally populate it and trigger the bot-rejection path.
 */

export interface SubmitLeadIntent {
  need?: string;
  context?: string[];
  budget?: string;
}

export interface SubmitLeadPayload {
  lead_type: "advisor" | "platform";
  user_email: string;
  user_name?: string;
  user_phone?: string;
  user_location_state?: string;
  /** Passed through to the DB even though the API does not currently use it. */
  user_postcode?: string;
  user_suburb?: string;
  user_intent?: SubmitLeadIntent;
  professional_id?: number;
  broker_slug?: string;
  /** Free-form source tag: page path plus any hub extras, e.g. "/find-advisor" or "hub-super|goal=retire". */
  source_page: string;
  exclude_advisor_ids?: number[];
  rematch?: boolean;
  prev_lead_ids?: number[];
  /** When true: run matching + return advisor but skip all DB writes and emails. */
  dry_run?: boolean;
  /** Skip matching, create lead directly for this advisor. */
  confirm_advisor_id?: number;
}

export interface SubmitLeadResult {
  success?: boolean;
  lead_id?: number | null;
  matched?: unknown | null;
  no_more_matches?: boolean;
  error?: string;
}

/**
 * Submit a lead via the /api/submit-lead route.
 *
 * Throws if the server returns a non-2xx status (with `error` from the
 * response body as the message). Callers own the try/catch and UX.
 */
export async function submitLead(
  payload: SubmitLeadPayload,
): Promise<SubmitLeadResult> {
  const res = await fetch("/api/submit-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: SubmitLeadResult = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Lead submission failed");
  return json;
}
