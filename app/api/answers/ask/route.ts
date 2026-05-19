import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("qa-ask");

const CATEGORY_VALUES = [
  "share_broker",
  "super_fund",
  "crypto_exchange",
  "managed_funds",
  "property",
  "cross_border:uk",
  "cross_border:us",
  "cross_border:firb",
  "advisor",
  "general",
] as const;

const AskBody = z.object({
  question: z.string().min(10).max(500),
  category: z.enum(CATEGORY_VALUES).default("general"),
  email: z.string().email().max(254).optional(),
});

function generateSlug(): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString("hex");
  return `qqq${ts}${rand}`;
}

function hashIp(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + (process.env.QA_IP_HASH_SALT ?? "invest-qa-v1"))
    .digest("hex")
    .slice(0, 16);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (await isRateLimited(`qa_ask:${ip}`, 5, 3600)) {
    return NextResponse.json(
      { error: "Too many questions submitted. Please try again in an hour." },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = AskBody.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { question, category, email } = parsed.data;
  const slug = generateSlug();
  const supabase = await createClient();

  const { error } = await supabase.from("qa_questions").insert({
    slug,
    question_text: question.trim(),
    category,
    email: email?.trim() ?? null,
    source_ip_hash: hashIp(ip),
    status: "pending",
  });

  if (error) {
    log.error("qa_questions insert failed", { error: error.message });
    return NextResponse.json(
      { error: "Failed to submit question. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ slug, status: "pending" });
}
