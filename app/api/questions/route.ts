import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";

const log = logger("questions");

// All fields optional so Zod v4 doesn't emit an invalid_type error for missing
// required fields (v4 removed the required_error constructor param). Required
// field presence is enforced by the manual check below.
const Body = z.object({
  broker_slug: z.string().optional(),
  page_slug: z.string().optional(),
  question: z.string().optional(),
  display_name: z.string().optional(),
  page_type: z.string().optional(),
  email: z.string().email().max(254).nullish(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`question:${ip}`, 5, 60)) {
    return NextResponse.json({ error: "Too many questions. Try again later." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { broker_slug, page_slug, question, display_name, page_type, email } = parsed.data;

  if (!broker_slug || !page_slug || !question || !display_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (question.length < 10 || question.length > 500) {
    return NextResponse.json({ error: "Question must be 10-500 characters" }, { status: 400 });
  }
  if (display_name.length < 2 || display_name.length > 100) {
    return NextResponse.json({ error: "Name must be 2-100 characters" }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase.from("broker_questions").insert({
    broker_slug,
    page_type: page_type ?? "broker",
    page_slug,
    question: question.trim(),
    display_name: display_name.trim(),
    email: email?.trim() ?? null,
    status: "pending",
  });

  if (error) {
    log.error("Question insert error", { error: error.message });
    return NextResponse.json({ error: "Failed to submit question" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Question submitted for review" });
}
