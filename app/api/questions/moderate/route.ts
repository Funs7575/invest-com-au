import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/** Escape HTML special chars to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Fire-and-forget answer notification email via Resend */
async function notifyQuestionAsker(
  answerId: number,
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  const supabase = createAdminClient();

  // Get the answer + parent question in one query
  const { data: answer } = await supabase
    .from("broker_answers")
    .select("question_id, answer, display_name")
    .eq("id", answerId)
    .single();

  if (!answer) return;

  const { data: question } = await supabase
    .from("broker_questions")
    .select("question, display_name, email, broker_slug, page_slug")
    .eq("id", answer.question_id)
    .single();

  if (!question?.email) return; // No email provided — can't notify

  const brokerSlug = question.broker_slug;
  const questionSnippet = escapeHtml(
    question.question.length > 80
      ? question.question.slice(0, 77) + "..."
      : question.question,
  );
  const answerSnippet = escapeHtml(
    answer.answer.length > 200
      ? answer.answer.slice(0, 197) + "..."
      : answer.answer,
  );
  const answeredBy = escapeHtml(answer.display_name || "the community");

  const pageUrl = `https://invest.com.au/broker/${brokerSlug}#questions`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 24px 16px;">
      <div style="background: #0f172a; padding: 20px 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <span style="color: #fff; font-weight: 800; font-size: 16px;">Your Question Was Answered 💬</span>
      </div>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          Hi ${escapeHtml(question.display_name || "there")},
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Someone has answered your question. Here's a preview:
        </p>

        <!-- Original question -->
        <div style="background: #f8fafc; border-left: 3px solid #94a3b8; padding: 12px 16px; margin: 0 0 16px; border-radius: 0 6px 6px 0;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Your Question</p>
          <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${questionSnippet}</p>
        </div>

        <!-- Answer -->
        <div style="background: #f0fdf4; border-left: 3px solid #15803d; padding: 12px 16px; margin: 0 0 20px; border-radius: 0 6px 6px 0;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase;">Answer from ${answeredBy}</p>
          <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${answerSnippet}</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${pageUrl}" style="display: inline-block; padding: 12px 28px; background: #0f172a; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">View Full Answer →</a>
        </div>

        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 24px 0 0 0; line-height: 1.5;">
          Invest.com.au — Independent investing education &amp; comparison<br>
          <a href="https://invest.com.au/unsubscribe" style="color: #94a3b8;">Unsubscribe</a>
        </p>
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
        from: "Invest.com.au <hello@invest.com.au>",
        to: [question.email],
        subject: `Your question about ${brokerSlug} was answered`,
        html,
      }),
    });
  } catch (err) {
    console.error("Answer notification email failed (non-blocking):", err);
  }
}

export async function POST(req: Request) {
  try {
    // ── Auth check: require an authenticated admin user ──
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@invest.com.au').split(',').map(e => e.trim().toLowerCase());
    const supabaseAuth = await createClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, id, action } = body;

    // Validate inputs
    if (!type || !id || !action) {
      return NextResponse.json({ error: "Missing type, id, or action" }, { status: 400 });
    }
    if (!["question", "answer"].includes(type)) {
      return NextResponse.json({ error: "Type must be 'question' or 'answer'" }, { status: 400 });
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const supabase = await createClient();
    const table = type === "question" ? "broker_questions" : "broker_answers";
    const newStatus = action === "approve" ? "approved" : "rejected";

    const { error } = await supabase
      .from(table)
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error(`Moderate ${type} error:`, error);
      return NextResponse.json({ error: `Failed to ${action} ${type}` }, { status: 500 });
    }

    // Notify the question asker when their answer is approved
    if (type === "answer" && action === "approve") {
      notifyQuestionAsker(id).catch((err) => {
        console.error("Answer notification failed (non-blocking):", err);
      });
    }

    return NextResponse.json({ success: true, message: `${type} ${action}d` });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
