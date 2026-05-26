/**
 * GET /api/cron/firm-performance-digest
 *
 * Weekly email digest sent to every active firm admin. Summarises their
 * firm's 7-day engagement metrics (views, enquiries, bookings) and
 * highlights the top-performing member for the week.
 *
 * Schedule: weekly-mon-8 (Monday 08:00 UTC) — lands before the Australian
 * business day starts so admins see the digest first thing.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { withCronRunLog } from "@/lib/cron-run-log";
import { sendEmail } from "@/lib/resend";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

const log = logger("cron-firm-performance-digest");

type FirmAdminRow = {
  id: number;
  name: string;
  email: string;
  firm_id: number;
};

type MetricRow = {
  professional_id: number;
  profile_views: number | null;
  enquiry_count: number | null;
  booking_clicks: number | null;
};

type MemberNameRow = {
  id: number;
  name: string;
};

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("firm-performance-digest", async () => {
    const admin = createAdminClient();
    const siteUrl = getSiteUrl();

    // 7-day window
    const now = new Date();
    const windowStart = _isoDate(7, now);
    const windowEnd = _isoDate(0, now);

    // Load all active firm admins who have an email
    const { data: adminRows, error: adminErr } = await admin
      .from("professionals")
      .select("id, name, email, firm_id")
      .eq("is_firm_admin", true)
      .eq("status", "active")
      .not("email", "is", null)
      .not("firm_id", "is", null);

    if (adminErr) {
      log.error("Failed to load firm admins", { error: adminErr.message });
      return {
        response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }),
        stats: {},
      };
    }

    const admins = (adminRows ?? []) as unknown as FirmAdminRow[];
    if (admins.length === 0) {
      return {
        response: NextResponse.json({ success: true, sent: 0 }),
        stats: { sent: 0 },
      };
    }

    // Group admins by firm_id so we only fetch each firm's data once
    const firmAdminsMap = new Map<number, FirmAdminRow[]>();
    for (const a of admins) {
      const existing = firmAdminsMap.get(a.firm_id) ?? [];
      existing.push(a);
      firmAdminsMap.set(a.firm_id, existing);
    }

    let sent = 0;

    for (const [firmId, firmAdmins] of firmAdminsMap) {
      // Load all active member IDs for this firm
      const { data: memberRows } = await admin
        .from("professionals")
        .select("id, name")
        .eq("firm_id", firmId)
        .eq("status", "active");

      const members = (memberRows ?? []) as unknown as MemberNameRow[];
      const memberIds = members.map((m) => m.id);
      const nameById = new Map(members.map((m) => [m.id, m.name]));

      if (memberIds.length === 0) continue;

      // Aggregate 7-day metrics
      const { data: metricRows } = await admin
        .from("advisor_metrics_daily")
        .select("professional_id, profile_views, enquiry_count, booking_clicks")
        .in("professional_id", memberIds)
        .gte("date", windowStart)
        .lte("date", windowEnd);

      const metricMap = new Map<
        number,
        { views: number; enquiries: number; bookings: number }
      >();
      for (const row of (metricRows ?? []) as unknown as MetricRow[]) {
        const e = metricMap.get(row.professional_id) ?? {
          views: 0,
          enquiries: 0,
          bookings: 0,
        };
        e.views += row.profile_views ?? 0;
        e.enquiries += row.enquiry_count ?? 0;
        e.bookings += row.booking_clicks ?? 0;
        metricMap.set(row.professional_id, e);
      }

      const firmTotals = { views: 0, enquiries: 0, bookings: 0 };
      let topMemberId: number | null = null;
      let topMemberEnquiries = -1;

      for (const [proId, m] of metricMap) {
        firmTotals.views += m.views;
        firmTotals.enquiries += m.enquiries;
        firmTotals.bookings += m.bookings;
        if (m.enquiries > topMemberEnquiries) {
          topMemberEnquiries = m.enquiries;
          topMemberId = proId;
        }
      }

      const topMemberName =
        topMemberId !== null && topMemberEnquiries > 0
          ? (nameById.get(topMemberId) ?? null)
          : null;

      const conversionRate =
        firmTotals.views > 0
          ? ((firmTotals.enquiries / firmTotals.views) * 100).toFixed(1)
          : "0.0";

      const tableRows = members
        .map((m) => {
          const metrics = metricMap.get(m.id) ?? { views: 0, enquiries: 0, bookings: 0 };
          return { name: m.name, ...metrics };
        })
        .sort((a, b) => b.enquiries - a.enquiries)
        .slice(0, 10);

      const memberTableHtml = tableRows
        .map(
          (r) =>
            `<tr>
               <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${r.name}</td>
               <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">${r.views}</td>
               <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#059669">${r.enquiries}</td>
               <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">${r.bookings}</td>
             </tr>`,
        )
        .join("");

      for (const admin_ of firmAdmins) {
        if (!admin_.email) continue;
        const firstName = admin_.name.split(" ")[0] ?? admin_.name;

        const html = `
          <p>Hi ${firstName},</p>
          <p>Here's your firm's performance for the 7 days ending ${windowEnd}:</p>

          <table style="border-collapse:collapse;width:100%;max-width:520px;font-size:13px;margin:20px 0">
            <tr style="background:#f8fafc">
              <td style="padding:10px 12px;font-weight:700;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Metric</td>
              <td style="padding:10px 12px;font-weight:700;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.05em;text-align:right">Total</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">Profile views</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${firmTotals.views}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">Enquiries</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#059669">${firmTotals.enquiries}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">Booking clicks</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">${firmTotals.bookings}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px">Conversion rate</td>
              <td style="padding:8px 12px;text-align:right;font-weight:600">${conversionRate}%</td>
            </tr>
          </table>

          ${
            tableRows.length > 0
              ? `<p style="font-weight:600;margin-top:24px;margin-bottom:8px">Member breakdown (top ${tableRows.length})</p>
                 <table style="border-collapse:collapse;width:100%;max-width:520px;font-size:12px">
                   <tr style="background:#f8fafc">
                     <th style="padding:8px 12px;text-align:left;font-weight:600;color:#64748b;font-size:11px;text-transform:uppercase">Advisor</th>
                     <th style="padding:8px 12px;text-align:right;font-weight:600;color:#64748b;font-size:11px;text-transform:uppercase">Views</th>
                     <th style="padding:8px 12px;text-align:right;font-weight:600;color:#64748b;font-size:11px;text-transform:uppercase">Enquiries</th>
                     <th style="padding:8px 12px;text-align:right;font-weight:600;color:#64748b;font-size:11px;text-transform:uppercase">Bookings</th>
                   </tr>
                   ${memberTableHtml}
                 </table>`
              : ""
          }

          ${
            topMemberName
              ? `<p style="margin-top:20px">🏆 <strong>${topMemberName}</strong> led the firm with <strong>${topMemberEnquiries} enquir${topMemberEnquiries === 1 ? "y" : "ies"}</strong> this week.</p>`
              : ""
          }

          <p style="text-align:center;margin:28px 0">
            <a href="${siteUrl}/firm-portal/performance"
               style="background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
              View full performance dashboard →
            </a>
          </p>
          <p style="font-size:11px;color:#94a3b8">
            You're receiving this because you're a firm admin on Invest.com.au.
            Figures cover ${windowStart} to ${windowEnd} UTC.
          </p>
        `;

        try {
          await sendEmail({
            to: admin_.email,
            subject: `Your firm's weekly performance — ${windowEnd}`,
            html,
          });
          sent++;
        } catch (err) {
          log.error("Failed to send digest", { id: admin_.id, err });
        }
      }
    }

    log.info("firm-performance-digest complete", { sent });
    return {
      response: NextResponse.json({ success: true, sent }),
      stats: { sent },
    };
  });
}

function _isoDate(daysAgo: number, from: Date): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
