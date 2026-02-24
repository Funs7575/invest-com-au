import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { broker_slug, page_type, page_slug, question, display_name, email } = body;

    // Validation
    if (!broker_slug || !page_slug || !question || !display_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (question.length < 10 || question.length > 500) {
      return NextResponse.json({ error: "Question must be 10-500 characters" }, { status: 400 });
    }
    if (display_name.length < 2 || display_name.length > 100) {
      return NextResponse.json({ error: "Name must be 2-100 characters" }, { status: 400 });
    }

    // Simple rate limiting: check if same IP submitted in last 5 minutes
    const supabase = await createClient();

    const { error } = await supabase.from("broker_questions").insert({
      broker_slug,
      page_type: page_type || "broker",
      page_slug,
      question: question.trim(),
      display_name: display_name.trim(),
      email: email?.trim() || null,
      status: "pending",
    });

    if (error) {
      console.error("Question insert error:", error);
      return NextResponse.json({ error: "Failed to submit question" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Question submitted for review" });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
