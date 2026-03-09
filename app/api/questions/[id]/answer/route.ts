import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { notificationFooter } from "@/lib/email-templates";
import { isRateLimited } from "@/lib/rate-limit";

const log = logger("questions");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`question_answer:${ip}`, 10, 60)) {
      return NextResponse.json({ error: "Too many answers submitted. Please try again later." }, { status: 429 });
    }

    const { id } = await params;
    const questionId = parseInt(id, 10);
    if (isNaN(questionId)) {
      return NextResponse.json({ error: "Invalid question ID" }, { status: 400 });
    }

    const body = await req.json();
    const { answer, answered_by, author_slug, display_name } = body;

    // Validation
    if (!answer || answer.trim().length < 10) {
      return NextResponse.json({ error: "Answer must be at least 10 characters" }, { status: 400 });
    }
    if (answer.length > 2000) {
      return NextResponse.json({ error: "Answer must be under 2000 characters" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify question exists
    const { data: question } = await supabase
      .from("broker_questions")
      .select("id, status")
      .eq("id", questionId)
      .single();

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const { error } = await supabase.from("broker_answers").insert({
      question_id: questionId,
      answer: answer.trim(),
      answered_by: answered_by || "community",
      author_slug: author_slug || null,
      display_name: display_name?.trim() || null,
      status: "pending",
      is_accepted: false,
    });

    if (error) {
      log.error("Answer insert error", { error: error.message });
      return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
    }

    // Notify the question asker that their question was answered
    if (process.env.RESEND_API_KEY) {
      const { data: fullQuestion } = await supabase
        .from("broker_questions")
        .select("asker_email, asker_name, question, broker_slug, brokers(name)")
        .eq("id", questionId)
        .single();

      if (fullQuestion?.asker_email) {
        const brokerName = ((fullQuestion.brokers as { name: string }[] | null)?.[0])?.name || fullQuestion.broker_slug || "a platform";
        const firstName = (fullQuestion.asker_name || "there").split(" ")[0];
        const { getSiteUrl } = await import("@/lib/url"); const siteUrl = getSiteUrl();

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Invest.com.au <questions@invest.com.au>",
            to: fullQuestion.asker_email,
            subject: `Your question about ${brokerName} was answered`,
            html: `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">Your Question Was Answered</h2><p style="color:#64748b;font-size:14px">Hi ${firstName}, someone answered your question about <strong>${brokerName}</strong>:</p><div style="background:#f8fafc;padding:12px;border-radius:8px;margin:8px 0;border-left:3px solid #0f172a"><p style="font-size:13px;color:#334155;margin:0"><strong>Q:</strong> ${(fullQuestion.question || "").slice(0, 150)}${(fullQuestion.question || "").length > 150 ? "..." : ""}</p></div><div style="background:#f0fdf4;padding:12px;border-radius:8px;margin:8px 0;border-left:3px solid #22c55e"><p style="font-size:13px;color:#166534;margin:0"><strong>A:</strong> ${answer.trim().slice(0, 200)}${answer.length > 200 ? "..." : ""}</p></div><a href="${siteUrl}/broker/${fullQuestion.broker_slug}" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">View Full Answer →</a>${notificationFooter(fullQuestion.asker_email)}</div>`,
          }),
        }).catch((err) => console.error("[questions-answer] Answer notification email failed:", err));
      }
    }

    return NextResponse.json({ success: true, message: "Answer submitted" });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
