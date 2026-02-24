import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
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

    return NextResponse.json({ success: true, message: `${type} ${action}d` });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
