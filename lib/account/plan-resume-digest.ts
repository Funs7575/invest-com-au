/**
 * Plan-resume-digest helpers — selects the draft action plans that
 * deserve a "pick up where you left off" nudge and renders the email.
 *
 * Selection rules (all must hold):
 *   - status = 'draft'
 *   - auth_user_id IS NOT NULL (we need someone to email)
 *   - updated_at < now - 3 days (not actively in-flight)
 *   - no plan_resume_emails row in the last 7 days for the user
 *
 * Pure rendering kept separate from the Supabase + send side so unit
 * tests can pin the copy without mocking the DB.
 */

export interface DigestCandidate {
  plan_id: number;
  auth_user_id: string;
  email: string;
  goal: string | null;
  intent_slug: string | null;
  share_token: string;
  updated_at: string;
}

export function renderDigestEmail(candidate: {
  goal: string | null;
  intent_slug: string | null;
  share_token: string;
  baseUrl: string;
}): { subject: string; html: string } {
  const goalLine = candidate.goal
    ? candidate.goal
    : candidate.intent_slug
      ? candidate.intent_slug.replace(/_/g, " ")
      : "your action plan";
  const url = `${candidate.baseUrl.replace(/\/$/, "")}/plans/${candidate.share_token}`;
  const subject = `Pick up where you left off — ${goalLine}`;
  const html = `
    <p>Hi,</p>
    <p>You started building an investment action plan for <strong>${escapeHtml(goalLine)}</strong> but didn't finish.</p>
    <p>It takes under a minute to wrap up, and you'll see your matched route + recommended next steps straight after.</p>
    <p><a href="${url}" style="display:inline-block;background:#f59e0b;color:#0f172a;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:700;">Resume my plan</a></p>
    <p style="color:#64748b;font-size:12px;margin-top:24px;">You're getting this because you saved a plan on Invest.com.au. Reply to opt out.</p>
  `.trim();
  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Decide whether a candidate should be skipped because we already
 * emailed them recently. `recentSends` is the set of auth_user_id
 * strings with a `plan_resume_emails` row in the last 7 days.
 */
export function shouldSkip(
  candidate: { auth_user_id: string },
  recentSends: Set<string>,
): boolean {
  return recentSends.has(candidate.auth_user_id);
}
