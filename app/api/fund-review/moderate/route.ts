import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { notificationFooter } from "@/lib/email-templates";
import { ADMIN_EMAILS } from "@/lib/admin";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("fund-review");

export async function POST(request: NextRequest) {
  const supabaseAuth = await createServerClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    // eslint-disable-next-line invest/no-unvalidated-req-json -- mirrors app/api/user-review/moderate/route.ts (broker reviews); admin-only path behind ADMIN_EMAILS auth check above
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { review_id, action, moderation_note } = body as {
    review_id?: number;
    action?: "approve" | "reject";
    moderation_note?: string;
  };

  if (!review_id || typeof review_id !== "number") {
    return NextResponse.json({ error: "review_id is required" }, { status: 400 });
  }
  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const newStatus = action === "approve" ? "approved" : "rejected";

  const { data, error } = await supabase
    .from("fund_reviews")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      moderation_note: moderation_note ? String(moderation_note).slice(0, 500) : null,
    })
    .eq("id", review_id)
    .select("id, status")
    .single();

  if (error) {
    log.error("fund_review moderate error", { error: error.message });
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  if (process.env.RESEND_API_KEY) {
    const { data: review } = await supabase
      .from("fund_reviews")
      .select("display_name, email, fund_slug, fund_listings(title)")
      .eq("id", review_id)
      .single();

    if (review?.email) {
      const fundTitle = ((review.fund_listings as { title: string }[] | null)?.[0])?.title || review.fund_slug;
      const firstName = (review.display_name || "there").split(" ")[0];
      // fundTitle, firstName, moderation_note all originate in user-controlled
      // fields (display_name from the submitter; title from fund_listings which
      // is editorially edited; moderation_note from admin free-text). Escape
      // before HTML interpolation to block injection per lib/html-escape.ts.
      const safeFundTitle = escapeHtml(fundTitle);
      const safeFirstName = escapeHtml(firstName);
      const safeModerationNote = moderation_note ? escapeHtml(String(moderation_note)) : "";

      if (action === "approve") {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Invest.com.au <reviews@invest.com.au>",
            to: review.email,
            subject: `Your review of ${fundTitle} is now live`,
            html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto"><h2 style="color:#0f172a;font-size:16px">Review Published ✓</h2><p style="color:#64748b;font-size:14px">Hi ${safeFirstName}, your review of <strong>${safeFundTitle}</strong> has been approved and is now visible on the platform.</p><p style="color:#64748b;font-size:14px">Thank you for contributing — your feedback helps other investors make better decisions.</p>${notificationFooter(review.email)}</div>`,
          }),
        }).catch((err) => log.error("Approval notification email failed", { error: err instanceof Error ? err.message : String(err) }));
      } else if (action === "reject" && moderation_note) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Invest.com.au <reviews@invest.com.au>",
            to: review.email,
            subject: `Update on your review of ${fundTitle}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto"><h2 style="color:#0f172a;font-size:16px">Review Update</h2><p style="color:#64748b;font-size:14px">Hi ${safeFirstName}, your review of <strong>${safeFundTitle}</strong> was not published.</p>${safeModerationNote ? `<p style="background:#fef2f2;padding:10px;border-radius:6px;font-size:13px;color:#991b1b;border-left:3px solid #ef4444"><strong>Reason:</strong> ${safeModerationNote}</p>` : ""}<p style="color:#64748b;font-size:14px">You're welcome to submit a new review.</p>${notificationFooter(review.email)}</div>`,
          }),
        }).catch((err) => log.error("Rejection notification email failed", { error: err instanceof Error ? err.message : String(err) }));
      }
    }
  }

  return NextResponse.json({ success: true, review: data });
}
