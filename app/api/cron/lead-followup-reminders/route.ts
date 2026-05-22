import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("cron:lead-followup-reminders");

// Advisor Pipeline CRM — daily cron that emails advisors when a lead's
// next_action_at is overdue (past now) and the pipeline stage is not terminal.
// Anti-spam: one reminder per lead per day — the cron runs once, not in a loop.

interface OverdueLead {
  id: number;
  professional_id: number;
  user_name: string;
  pipeline_stage: string;
  next_action_at: string;
}

interface AdvisorRow {
  id: number;
  name: string;
  email: string;
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();
  const siteUrl = getSiteUrl();

  // Pull all overdue leads (next_action_at in the past, non-terminal stage)
  const { data: overdueLeads, error: leadsErr } = await supabase
    .from("professional_leads")
    .select("id, professional_id, user_name, pipeline_stage, next_action_at")
    .not("pipeline_stage", "in", '("won","lost")')
    .not("next_action_at", "is", null)
    .lt("next_action_at", startedAt)
    .limit(500);

  if (leadsErr) {
    log.error("overdue leads query failed", { err: leadsErr.message });
    return NextResponse.json({ error: leadsErr.message }, { status: 500 });
  }

  const leads = (overdueLeads ?? []) as OverdueLead[];

  if (leads.length === 0) {
    log.info("lead-followup-reminders: no overdue leads");
    return NextResponse.json({ startedAt, reminders: 0, status: "nothing_overdue" });
  }

  // Group by advisor
  const byAdvisor = new Map<number, OverdueLead[]>();
  for (const lead of leads) {
    const existing = byAdvisor.get(lead.professional_id) ?? [];
    existing.push(lead);
    byAdvisor.set(lead.professional_id, existing);
  }

  // Fetch advisor contact details for all unique professional_ids
  const advisorIds = [...byAdvisor.keys()];
  const { data: advisors, error: advisorErr } = await supabase
    .from("professionals")
    .select("id, name, email")
    .in("id", advisorIds)
    .not("email", "is", null);

  if (advisorErr) {
    log.error("advisor lookup failed", { err: advisorErr.message });
    return NextResponse.json({ error: advisorErr.message }, { status: 500 });
  }

  const advisorMap = new Map<number, AdvisorRow>();
  for (const a of (advisors ?? []) as AdvisorRow[]) {
    advisorMap.set(a.id, a);
  }

  const STAGE_LABELS: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    proposal_sent: "Proposal Sent",
    negotiating: "Negotiating",
  };

  let reminders = 0;
  const failures: { advisor_id: number; err: string }[] = [];

  for (const [advisorId, advisorLeads] of byAdvisor) {
    const advisor = advisorMap.get(advisorId);
    if (!advisor?.email) continue;

    const leadRows = advisorLeads
      .map((l) => {
        const stage = STAGE_LABELS[l.pipeline_stage] ?? l.pipeline_stage;
        const due = new Date(l.next_action_at).toLocaleDateString("en-AU", {
          day: "numeric", month: "short",
        });
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155">${l.user_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b">${stage}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#dc2626;font-weight:600">${due}</td>
        </tr>`;
      })
      .join("");

    const result = await sendEmail({
      to: advisor.email,
      subject: `${advisorLeads.length} lead${advisorLeads.length === 1 ? "" : "s"} overdue for follow-up`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#334155">
          <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
            <h1 style="color:white;margin:0;font-size:18px">Follow-up Reminder</h1>
          </div>
          <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <p style="font-size:15px;margin-top:0">Hi ${advisor.name}, you have <strong>${advisorLeads.length}</strong> lead${advisorLeads.length === 1 ? "" : "s"} that ${advisorLeads.length === 1 ? "is" : "are"} overdue for follow-up.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;background:white;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
              <thead>
                <tr style="background:#f8fafc">
                  <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase">Lead</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase">Stage</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase">Due</th>
                </tr>
              </thead>
              <tbody>${leadRows}</tbody>
            </table>
            <div style="text-align:center;margin:20px 0">
              <a href="${siteUrl}/advisor-portal"
                 style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
                Open Leads &rarr;
              </a>
            </div>
          </div>
        </div>
      `,
    });

    if (!result.ok) {
      failures.push({ advisor_id: advisorId, err: result.error ?? "unknown" });
      continue;
    }
    reminders++;
  }

  log.info("lead-followup-reminders complete", {
    overdue: leads.length,
    advisorsNotified: reminders,
    failures: failures.length,
  });

  return NextResponse.json({
    startedAt,
    overdueLeads: leads.length,
    advisorsNotified: reminders,
    failures: failures.length,
  });
}
