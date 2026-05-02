import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";

const log = logger("questions");

const Body = z.object({
  broker_slug: z.string({ required_error: "Missing required fields" }).min(1, "Missing required fields"),
  page_slug: z.string({ required_error: "Missing required fields" }).min(1, "Missing required fields"),
  question: z
    .string({ required_error: "Missing required fields" })
    .min(10, "Question must be 10-500 characters")
    .max(500, "Question must be 10-500 characters"),
  display_name: z
    .string({ required_error: "Missing required fields" })
    .min(2, "Name must be 2-100 characters")
    .max(100, "Name must be 2-100 characters"),
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
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const body = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("broker_questions").insert({
    broker_slug: body.broker_slug,
    page_type: body.page_type ?? "broker",
    page_slug: body.page_slug,
    question: body.question.trim(),
    display_name: body.display_name.trim(),
    email: body.email?.trim() ?? null,
    status: "pending",
  });

  if (error) {
    log.error("Question insert error", { error: error.message });
    return NextResponse.json({ error: "Failed to submit question" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Question submitted for review" });
}
