/**
 * maskBriefForProvider — strips PII from a brief row so it can be shown
 * to providers in the inbox preview. Contact details (name, email,
 * phone) are only re-attached after a successful credit-accept.
 */

import type { BriefRow, MaskedBrief } from "./types";

const PREVIEW_LIMIT = 280;

export function maskBriefForProvider(row: BriefRow): MaskedBrief {
  const description = row.job_description ?? "";
  const truncated =
    description.length > PREVIEW_LIMIT
      ? `${description.slice(0, PREVIEW_LIMIT).trimEnd()}…`
      : description;

  return {
    id: row.id,
    slug: row.slug,
    brief_template: row.brief_template,
    brief_payload: row.brief_payload ?? {},
    provider_preference: row.provider_preference,
    routing_mode: row.routing_mode,
    budget_band: row.budget_band,
    location: row.location,
    advisor_types: row.advisor_types,
    job_title: row.job_title,
    description_preview: truncated,
    accept_credits_cost: row.accept_credits_cost,
    created_at: row.created_at,
    ends_at: row.ends_at,
    status: row.status,
    tracker_status: row.tracker_status,
  };
}
