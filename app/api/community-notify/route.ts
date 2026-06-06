import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";

const Body = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`community_notify:${ip}`, 3, 60)) {
    return NextResponse.json({ error: "Too many requests. Please try again." }, { status: 429 });
  }

  const raw = await request.json().catch(() => null);
  const result = Body.safeParse(raw);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from("community_waitlist").upsert({ email: result.data.email }, { onConflict: "email", ignoreDuplicates: true });

  return NextResponse.json({ ok: true });
}
