import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { sendEmail } from "@/lib/resend";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:business-finance:enquiry");

const EnquirySchema = z.object({
  business_name: z.string().min(1).max(200),
  contact_name: z.string().min(1).max(200),
  email: z.string().email().max(254),
  phone: z.string().max(30).optional(),
  finance_type: z.enum([
    "business_loan",
    "equipment_finance",
    "invoice_finance",
    "line_of_credit",
    "trade_finance",
    "other",
  ]),
  loan_amount: z.number().min(0).max(50_000_000).optional(),
  purpose: z.string().max(1000).optional(),
  time_in_business_months: z.number().int().min(0).max(1200).optional(),
  annual_revenue: z.number().min(0).max(500_000_000).optional(),
  message: z.string().max(2000).optional(),
  // Honeypot
  website: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const allowed = await isAllowed("business_finance_enquiry", ipKey(req), {
    max: 5,
    refillPerSec: 0.05,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = EnquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    business_name,
    contact_name,
    email,
    phone,
    finance_type,
    loan_amount,
    purpose,
    time_in_business_months,
    annual_revenue,
    message,
    website,
  } = parsed.data;

  // Honeypot
  if (website && website.length > 0) {
    return NextResponse.json({ success: true });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  if (isDisposableEmail(email)) {
    return NextResponse.json(
      { error: "Please use a business email address." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error: insertErr } = await supabase
    .from("business_finance_enquiries")
    .insert({
      business_name,
      contact_name,
      email: email.toLowerCase(),
      phone: phone ?? null,
      finance_type,
      loan_amount_cents: loan_amount != null ? Math.round(loan_amount * 100) : null,
      purpose: purpose ?? null,
      time_in_business_months: time_in_business_months ?? null,
      annual_revenue_cents: annual_revenue != null ? Math.round(annual_revenue * 100) : null,
      message: message ?? null,
      status: "new",
    });

  if (insertErr) {
    log.error("business finance enquiry insert failed", { err: insertErr.message });
    return NextResponse.json({ error: "Failed to submit enquiry." }, { status: 500 });
  }

  const siteUrl = getSiteUrl();
  const financeLabels: Record<string, string> = {
    business_loan: "Business Loan",
    equipment_finance: "Equipment Finance",
    invoice_finance: "Invoice Finance",
    line_of_credit: "Line of Credit",
    trade_finance: "Trade Finance",
    other: "Other Business Finance",
  };
  const financeLabel = financeLabels[finance_type] ?? finance_type;

  // Confirmation to the enquirer
  await sendEmail({
    to: email,
    subject: `We've received your ${financeLabel} enquiry`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;color:#334155">
        <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:18px">Business Finance</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <p style="font-size:15px;margin-top:0">Hi ${contact_name}, thanks for your ${financeLabel} enquiry for <strong>${business_name}</strong>.</p>
          <p style="font-size:14px;color:#64748b">Our team will review your details and be in touch shortly. In the meantime, you can compare business finance options on our site.</p>
          <div style="text-align:center;margin:20px 0">
            <a href="${siteUrl}/business-finance"
               style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
              Compare Business Finance &rarr;
            </a>
          </div>
          <p style="font-size:11px;color:#94a3b8">General information only — not financial advice. Always consult a qualified finance broker before committing to any product.</p>
        </div>
      </div>
    `,
  });

  log.info("business finance enquiry submitted", { email, finance_type });
  return NextResponse.json({ success: true });
}
