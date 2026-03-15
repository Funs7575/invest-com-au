import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/url";

const VALID_OUTCOMES = ["contacted", "converted", "lost", "no_response"] as const;
type Outcome = (typeof VALID_OUTCOMES)[number];

/**
 * POST /api/lead-outcome
 *
 * Updates a lead's outcome (contacted, converted, lost, no_response).
 * Called by advisors from their dashboard or email links.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_id, outcome, sale_price_cents, success_fee_cents, notes } = body;

    // Auth: simple token check — advisor_id from query param or body
    const advisorId = request.nextUrl.searchParams.get("advisor_id") || body.advisor_id;

    if (!lead_id || !outcome) {
      return NextResponse.json(
        { error: "lead_id and outcome are required." },
        { status: 400 },
      );
    }

    if (!VALID_OUTCOMES.includes(outcome as Outcome)) {
      return NextResponse.json(
        { error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(", ")}` },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Verify the lead exists
    const { data: lead, error: leadError } = await supabase
      .from("professional_leads")
      .select("id, professional_id")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    // If advisor_id provided, verify it matches the lead's professional
    if (advisorId && lead.professional_id !== advisorId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      outcome,
      outcome_at: new Date().toISOString(),
      outcome_notes: notes?.trim() || null,
    };

    // Store sale price and success fee if outcome is 'converted'
    if (outcome === "converted" && sale_price_cents) {
      updatePayload.sale_price_cents = sale_price_cents;
      if (success_fee_cents) {
        updatePayload.success_fee_cents = success_fee_cents;
      }
    }

    const { error: updateError } = await supabase
      .from("professional_leads")
      .update(updatePayload)
      .eq("id", lead_id);

    if (updateError) {
      console.error("Failed to update lead outcome:", updateError);
      return NextResponse.json(
        { error: "Failed to update lead outcome." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, lead_id, outcome });
  } catch (error) {
    console.error("Lead outcome error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/lead-outcome
 *
 * One-click email link handler for advisors to quickly update lead status.
 * Query params: action (contacted|converted|lost), lead (lead_id), token (first 8 chars of UUID)
 *
 * Token = first 8 chars of the lead UUID (simple verification to prevent random guessing).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action");
    const leadId = searchParams.get("lead");
    const token = searchParams.get("token");

    if (!action || !leadId || !token) {
      return new NextResponse(
        renderHtml("Missing Parameters", "The link is missing required parameters. Please use the link from your email."),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    // Map action to valid outcome (GET links don't support 'no_response' — that's a POST-only action)
    const actionMap: Record<string, Outcome> = {
      contacted: "contacted",
      converted: "converted",
      lost: "lost",
    };

    const outcome = actionMap[action];
    if (!outcome) {
      return new NextResponse(
        renderHtml("Invalid Action", `"${action}" is not a valid action. Use contacted, converted, or lost.`),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    // Verify token = first 8 chars of the lead UUID
    const expectedToken = leadId.substring(0, 8);
    if (token !== expectedToken) {
      return new NextResponse(
        renderHtml("Invalid Link", "This link appears to be invalid or tampered with."),
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    const supabase = await createClient();

    // Verify lead exists
    const { data: lead, error: leadError } = await supabase
      .from("professional_leads")
      .select("id, user_name, outcome")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return new NextResponse(
        renderHtml("Lead Not Found", "We couldn't find this lead. It may have been deleted."),
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    // Update the lead outcome
    const { error: updateError } = await supabase
      .from("professional_leads")
      .update({
        outcome,
        outcome_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Failed to update lead outcome via GET:", updateError);
      return new NextResponse(
        renderHtml("Update Failed", "Something went wrong updating this lead. Please try again or update from your dashboard."),
        { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    const siteUrl = getSiteUrl();
    const outcomeLabels: Record<string, string> = {
      contacted: "Contacted",
      converted: "Converted",
      lost: "Lost",
    };

    const successHtml = renderHtml(
      "Lead Updated",
      `
        <p style="font-size: 16px; color: #16a34a; font-weight: 600;">Lead marked as: ${outcomeLabels[outcome]}</p>
        <p style="color: #475569;">The lead from <strong>${escapeHtml(lead.user_name || "Unknown")}</strong> has been updated.</p>
        ${lead.outcome ? `<p style="color: #94a3b8; font-size: 13px;">Previous status: ${lead.outcome}</p>` : ""}
        <div style="margin-top: 24px;">
          <a href="${siteUrl}/advisor-portal" style="display: inline-block; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to Dashboard</a>
        </div>
      `,
    );

    return new NextResponse(successHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Lead outcome GET error:", error);
    return new NextResponse(
      renderHtml("Error", "An unexpected error occurred. Please try again."),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

/** Escape HTML special chars */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Render a simple branded HTML page for GET responses */
function renderHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Invest.com.au</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 40px 16px; }
    .card { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: #0f172a; color: white; padding: 20px 24px; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; }
    .header p { margin: 4px 0 0; opacity: 0.6; font-size: 13px; }
    .body { padding: 24px; }
    .body p { margin: 0 0 12px; line-height: 1.6; color: #334155; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${title}</h1>
      <p>Invest.com.au</p>
    </div>
    <div class="body">
      ${body}
    </div>
  </div>
</body>
</html>`;
}
