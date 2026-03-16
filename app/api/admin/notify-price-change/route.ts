import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/admin";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";

const log = logger("notify-price-change");

const TYPE_LABELS: Record<string, string> = {
  mortgage_broker: "Mortgage Broker",
  buyers_agent: "Buyer's Agent",
  financial_planner: "Financial Planner",
  smsf_accountant: "SMSF Accountant",
  insurance_broker: "Insurance Broker",
  tax_agent: "Tax Agent",
  wealth_manager: "Wealth Manager",
  estate_planner: "Estate Planner",
  property_advisor: "Property Advisor",
  crypto_advisor: "Crypto Advisor",
  aged_care_advisor: "Aged Care Advisor",
  debt_counsellor: "Debt Counsellor",
  real_estate_agent: "Real Estate Agent",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export async function POST(request: NextRequest) {
  try {
    // Admin check via Supabase auth
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { advisor_type, old_price_cents, new_price_cents, field_changed } = body;

    if (!advisor_type || old_price_cents === undefined || new_price_cents === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Only notify on actual price changes (not min/max adjustments)
    if (old_price_cents === new_price_cents) {
      return NextResponse.json({ skipped: true, reason: "Price unchanged" });
    }

    const supabase = createAdminClient();

    // Fetch all active advisors of this type
    const { data: advisors, error } = await supabase
      .from("professionals")
      .select("id, name, email, type")
      .eq("type", advisor_type)
      .eq("status", "active");

    if (error) {
      log.error("Failed to fetch advisors", { error: error.message });
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!advisors || advisors.length === 0) {
      return NextResponse.json({ notified: 0, reason: "No active advisors of this type" });
    }

    const typeLabel = TYPE_LABELS[advisor_type] || advisor_type;
    const direction = new_price_cents > old_price_cents ? "increased" : "decreased";
    const isIncrease = new_price_cents > old_price_cents;

    let notified = 0;
    let failed = 0;

    for (const advisor of advisors) {
      if (!advisor.email) continue;

      try {
        await sendEmail({
          to: advisor.email,
          subject: `Lead pricing update — ${typeLabel} leads now ${formatCents(new_price_cents)}/lead`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
              <div style="background: #0f172a; padding: 24px 28px; border-radius: 12px 12px 0 0;">
                <h1 style="color: #f59e0b; font-size: 20px; margin: 0;">Invest<span style="color: #ffffff;">.com.au</span></h1>
              </div>
              <div style="padding: 28px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 15px; line-height: 1.6;">Hi ${advisor.name?.split(" ")[0] || "there"},</p>
                
                <p style="font-size: 15px; line-height: 1.6;">
                  We're writing to let you know that the lead pricing for <strong>${typeLabel}</strong> listings has been updated.
                </p>

                <div style="background: ${isIncrease ? "#fef3c7" : "#d1fae5"}; border: 1px solid ${isIncrease ? "#fcd34d" : "#6ee7b7"}; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
                  <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 4px 0; color: #64748b;">Previous price</td>
                      <td style="padding: 4px 0; text-align: right; text-decoration: line-through; color: #94a3b8;">${formatCents(old_price_cents)}/lead</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #1e293b; font-weight: 600;">New price</td>
                      <td style="padding: 4px 0; text-align: right; font-weight: 700; font-size: 16px; color: ${isIncrease ? "#b45309" : "#047857"};">${formatCents(new_price_cents)}/lead</td>
                    </tr>
                  </table>
                </div>

                <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                  ${isIncrease 
                    ? "This reflects the increased value and demand for qualified leads in your category. The new price takes effect immediately for all future leads." 
                    : "Great news — we've reduced the per-lead cost in your category. The new price takes effect immediately for all future leads."
                  }
                </p>

                <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                  Your current credit balance is unaffected — it will simply stretch ${isIncrease ? "fewer" : "further"} at the new rate.
                </p>

                <div style="text-align: center; margin: 24px 0;">
                  <a href="https://invest.com.au/advisor-portal" style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                    View Your Portal
                  </a>
                </div>

                <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
                  Questions? Reply to this email or contact us at support@invest.com.au
                </p>
              </div>
            </div>
          `,
        });
        notified++;
      } catch (emailErr) {
        failed++;
        log.warn("Failed to send price notification", { 
          advisorId: advisor.id, 
          email: advisor.email, 
          error: emailErr instanceof Error ? emailErr.message : String(emailErr) 
        });
      }
    }

    // Log the notification event
    await supabase.from("lead_pricing_log").insert({
      advisor_type,
      field_changed: field_changed || "price_cents",
      old_value: String(old_price_cents),
      new_value: String(new_price_cents),
      changed_by: `admin (notified ${notified} advisors)`,
    });

    log.info("Price change notifications sent", {
      advisor_type: typeLabel,
      old_price: formatCents(old_price_cents),
      new_price: formatCents(new_price_cents),
      notified,
      failed,
      total: advisors.length,
    });

    return NextResponse.json({ 
      success: true, 
      notified, 
      failed, 
      total: advisors.length,
      message: `Notified ${notified} of ${advisors.length} ${typeLabel}s` 
    });
  } catch (err) {
    log.error("Price change notification error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
