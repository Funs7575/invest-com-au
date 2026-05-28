import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";

const BodySchema = z.object({
  hubSlug: z.string().max(64),
  answers: z.record(z.string(), z.string()).optional(),
  email: z.string().max(254).optional(),
  name: z.string().max(100).optional(),
  resultKey: z.string().max(200).optional(),
});

const log = logger("hub-quiz-capture");

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { hubSlug, answers, email, name, resultKey } = parsed.data;

  // No email — nothing to persist (email is NOT NULL on quiz_leads)
  if (!email) {
    return NextResponse.json({ success: true });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: "Please use a real email address." }, { status: 400 });
  }

  if (!(await isAllowed("hub_quiz_capture", ipKey(request), { max: 5, refillPerSec: 1 / 60 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = createAdminClient();
  const sanitizedEmail = email.trim().toLowerCase().slice(0, 254);
  const sanitizedName = name?.trim().slice(0, 100) ?? null;

  const { error: leadError } = await supabase.from("quiz_leads").insert({
    email: sanitizedEmail,
    name: sanitizedName,
    answers: answers ?? {},
    inferred_vertical: hubSlug,
    ...(resultKey ? { top_match_slug: resultKey.slice(0, 100) } : {}),
  });

  if (leadError) {
    log.error("hub quiz_leads insert failed", { error: leadError.message, hubSlug });
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  // Fire-and-forget: upsert into unified subscriber list
  await supabase
    .from("email_captures")
    .upsert(
      {
        email: sanitizedEmail,
        source: `hub_quiz_${hubSlug}`.slice(0, 64),
        newsletter_opt_in: true,
        unsubscribed: false,
        ...(sanitizedName ? { name: sanitizedName } : {}),
      },
      { onConflict: "email" }
    )
    .then(({ error }) => {
      if (error) log.error("email_captures upsert failed", { error: error.message });
    });

  return NextResponse.json({ success: true });
}
