import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

/**
 * Cron: Check affiliate link health
 *
 * Runs daily. HEAD-requests each broker's affiliate_url to detect:
 * - Broken links (4xx/5xx)
 * - Timeouts
 * - Unexpected redirects (to error pages, parked domains, etc.)
 * Updates brokers.link_status, link_status_code, link_last_checked.
 * Sends an alert email if any links are broken.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: brokers, error } = await supabase
    .from("brokers")
    .select("id, slug, name, affiliate_url, link_status")
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const results: {
    slug: string;
    status: string;
    statusCode: number | null;
    previousStatus: string | null;
    changed: boolean;
  }[] = [];

  for (const broker of brokers || []) {
    if (!broker.affiliate_url || broker.affiliate_url.trim() === "") {
      await supabase
        .from("brokers")
        .update({
          link_status: "no_url",
          link_status_code: null,
          link_last_checked: now,
        })
        .eq("id", broker.id);

      results.push({
        slug: broker.slug,
        status: "no_url",
        statusCode: null,
        previousStatus: broker.link_status,
        changed: broker.link_status !== "no_url",
      });
      continue;
    }

    try {
      // Use GET with redirect: "manual" to detect redirects without following them
      // Some affiliate URLs redirect — that's normal. We check the initial response.
      const resp = await fetch(broker.affiliate_url, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; InvestComAu-LinkChecker/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });

      let linkStatus: string;
      if (resp.ok) {
        linkStatus = "ok";
      } else if (resp.status >= 300 && resp.status < 400) {
        linkStatus = "redirect";
      } else if (resp.status >= 400 && resp.status < 500) {
        linkStatus = "broken";
      } else if (resp.status >= 500) {
        linkStatus = "server_error";
      } else {
        linkStatus = `http_${resp.status}`;
      }

      const changed = broker.link_status !== linkStatus;

      await supabase
        .from("brokers")
        .update({
          link_status: linkStatus,
          link_status_code: resp.status,
          link_last_checked: now,
        })
        .eq("id", broker.id);

      results.push({
        slug: broker.slug,
        status: linkStatus,
        statusCode: resp.status,
        previousStatus: broker.link_status,
        changed,
      });
    } catch {
      const linkStatus = "timeout";
      const changed = broker.link_status !== linkStatus;

      await supabase
        .from("brokers")
        .update({
          link_status: linkStatus,
          link_status_code: null,
          link_last_checked: now,
        })
        .eq("id", broker.id);

      results.push({
        slug: broker.slug,
        status: linkStatus,
        statusCode: null,
        previousStatus: broker.link_status,
        changed,
      });
    }
  }

  // ── Send alert for broken/timed-out links ──
  const problemLinks = results.filter(
    (r) =>
      r.status === "broken" ||
      r.status === "server_error" ||
      r.status === "timeout"
  );

  if (problemLinks.length > 0) {
    await sendLinkHealthAlert(problemLinks);
  }

  // ── Log newly broken links to audit log ──
  const newlyBroken = results.filter(
    (r) =>
      r.changed &&
      (r.status === "broken" ||
        r.status === "server_error" ||
        r.status === "timeout")
  );

  for (const problem of newlyBroken) {
    const broker = (brokers || []).find((b) => b.slug === problem.slug);
    if (broker) {
      await supabase.from("admin_audit_log").insert({
        action: "link_broken",
        entity_type: "broker",
        entity_id: String(broker.id),
        entity_name: broker.name,
        details: {
          affiliate_url: broker.affiliate_url,
          status: problem.status,
          status_code: problem.statusCode,
          previous_status: problem.previousStatus,
        },
        admin_email: "system@cron",
      });
    }
  }

  return NextResponse.json({
    checked: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    broken: problemLinks.length,
    noUrl: results.filter((r) => r.status === "no_url").length,
    changed: results.filter((r) => r.changed).length,
    results,
    timestamp: now,
  });
}

async function sendLinkHealthAlert(
  problems: {
    slug: string;
    status: string;
    statusCode: number | null;
    previousStatus: string | null;
  }[]
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  const rows = problems
    .map((r) => {
      const statusColor =
        r.status === "broken"
          ? "#dc2626"
          : r.status === "timeout"
            ? "#d97706"
            : "#7c3aed";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600">${r.slug}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0"><span style="color:${statusColor};font-weight:600">${r.status.toUpperCase()}</span></td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${r.statusCode ?? "N/A"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#94a3b8">${r.previousStatus ?? "unknown"} → ${r.status}</td>
      </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#dc2626;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">🔗 Broken Affiliate Links Detected</h2>
      </div>
      <div style="background:#fff;padding:20px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#475569;font-size:14px"><strong>${problems.length}</strong> affiliate link(s) are returning errors. Each broken link means <strong>$0 revenue</strong> from that broker.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f8fafc">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #dc2626;color:#dc2626;font-size:11px;text-transform:uppercase">Broker</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #dc2626;color:#dc2626;font-size:11px;text-transform:uppercase">Status</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #dc2626;color:#dc2626;font-size:11px;text-transform:uppercase">HTTP Code</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #dc2626;color:#dc2626;font-size:11px;text-transform:uppercase">Change</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:16px;text-align:center">
          <a href="https://invest.com.au/admin/affiliate-links" style="display:inline-block;padding:10px 24px;background:#dc2626;color:#fff;font-weight:600;font-size:13px;border-radius:6px;text-decoration:none">Fix Links in Admin →</a>
        </div>
        <p style="color:#94a3b8;font-size:11px;margin-top:12px;text-align:center">Automated check by Invest.com.au Cron</p>
      </div>
    </div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Invest.com.au <alerts@invest.com.au>",
        to: ["hello@invest.com.au"],
        subject: `🔗 ${problems.length} broken affiliate link(s) — revenue at risk`,
        html,
      }),
    });
  } catch (err) {
    console.error("Failed to send link health alert:", err);
  }
}
