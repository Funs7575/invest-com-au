import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { sendReviewRequest } from "@/lib/advisor-emails";

const InviteBody = z.object({
  email: z.string().email("A valid email address is required."),
  name: z.string().min(1, "Client name is required.").max(200),
});

export const POST = withValidatedBody(InviteBody, async (request: NextRequest, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor-review-invite:${ip}`, 10, 60)) {
    return NextResponse.json({ error: "Too many requests. Please wait before sending more invitations." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch the advisor's name and slug
  const { data: advisor } = await admin
    .from("professionals")
    .select("name, slug")
    .eq("id", advisorId)
    .single();

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 500 });
  }

  const ok = await sendReviewRequest(
    body.email,
    body.name,
    advisor.name as string,
    advisor.slug as string,
  );

  if (!ok) {
    return NextResponse.json({ error: "Failed to send invitation email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
