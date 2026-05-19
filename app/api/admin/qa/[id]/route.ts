import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin";
import { respondToMessage } from "@/lib/chatbot";
import { loadQaCaptureConfig, preCheckCaps, recordUsage } from "@/lib/ai-cost-caps";
import { logger } from "@/lib/logger";

const log = logger("admin-qa-action");

const ActionBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate_draft") }),
  z.object({
    action: z.literal("approve"),
    answer_text: z.string().min(1).max(10000),
    answer_id: z.number().int().optional(),
  }),
  z.object({
    action: z.literal("reject"),
    moderation_note: z.string().max(500).optional(),
  }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();
  if (authError || !user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = ActionBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: question, error: fetchError } = await supabase
    .from("qa_questions")
    .select("id, slug, question_text, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const { action } = parsed.data;

  if (action === "generate_draft") {
    const cfg = loadQaCaptureConfig();
    const verdict = await preCheckCaps(`qa_admin_${user.id}`, cfg);
    if (!verdict.allowed) {
      return NextResponse.json({ error: "AI cost cap reached for today" }, { status: 429 });
    }

    const chatResponse = await respondToMessage(
      `qa_admin_${id}`,
      question.question_text as string,
      null,
      [],
    );

    if (chatResponse.model) {
      await recordUsage({
        subjectId: `qa_admin_${user.id}`,
        cfg,
        model: chatResponse.model,
        tokensIn: chatResponse.tokensIn,
        tokensOut: chatResponse.tokensOut,
      });
    }

    const { data: answer, error: insertError } = await supabase
      .from("qa_answers")
      .insert({
        question_id: id,
        answer_text: chatResponse.reply,
        source: "ai",
        status: "pending",
      })
      .select("id, answer_text")
      .single();

    if (insertError || !answer) {
      log.error("qa_answers insert failed", { error: insertError?.message, questionId: id });
      return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
    }

    return NextResponse.json({ answer_id: answer.id as number, answer_text: answer.answer_text as string });
  }

  if (action === "approve") {
    const { answer_text, answer_id } = parsed.data;
    const now = new Date().toISOString();

    if (answer_id != null) {
      const { error: updateError } = await supabase
        .from("qa_answers")
        .update({ answer_text, status: "approved", published_at: now, updated_at: now })
        .eq("id", answer_id)
        .eq("question_id", id);
      if (updateError) {
        log.error("qa_answers update failed", { error: updateError.message, answerId: answer_id });
        return NextResponse.json({ error: "Failed to update answer" }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase.from("qa_answers").insert({
        question_id: id,
        answer_text,
        source: "editorial",
        status: "approved",
        published_at: now,
      });
      if (insertError) {
        log.error("qa_answers insert failed on approve", { error: insertError.message, questionId: id });
        return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
      }
    }

    const { error: qError } = await supabase
      .from("qa_questions")
      .update({ status: "approved", updated_at: now })
      .eq("id", id);
    if (qError) {
      log.error("qa_questions approve failed", { error: qError.message, questionId: id });
      return NextResponse.json({ error: "Failed to approve question" }, { status: 500 });
    }

    revalidatePath("/answers");
    revalidatePath(`/answers/${question.slug as string}`);

    return NextResponse.json({ status: "approved", slug: question.slug as string });
  }

  if (action === "reject") {
    const { moderation_note } = parsed.data;
    const now = new Date().toISOString();

    const { error: qError } = await supabase
      .from("qa_questions")
      .update({ status: "rejected", moderation_note: moderation_note ?? null, updated_at: now })
      .eq("id", id);
    if (qError) {
      log.error("qa_questions reject failed", { error: qError.message, questionId: id });
      return NextResponse.json({ error: "Failed to reject question" }, { status: 500 });
    }

    return NextResponse.json({ status: "rejected" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
