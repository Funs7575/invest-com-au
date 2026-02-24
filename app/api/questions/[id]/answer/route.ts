import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      status: answered_by === "editorial" ? "approved" : "pending",
      is_accepted: false,
    });

    if (error) {
      console.error("Answer insert error:", error);
      return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Answer submitted" });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
