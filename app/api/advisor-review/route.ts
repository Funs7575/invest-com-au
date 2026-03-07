import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";

const PROFANITY = /\b(fuck|shit|cunt|bitch|asshole|dick|piss|bastard|wanker|slut|whore|nigger|faggot|retard)\b/i;
const SPAM_URL = /https?:\/\/[^\s]+/i;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`advisor_review:${ip}`, 5, 60)) {
    return NextResponse.json({ error: "Too many reviews. Please try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { professional_id, reviewer_name, reviewer_email, rating, title, body: reviewBody } = body;

    if (!professional_id || !reviewer_name?.trim() || !reviewer_email?.trim() || !rating || !reviewBody?.trim()) {
      return NextResponse.json({ error: "Name, email, rating, and review text are required." }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reviewer_email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    // Auto-moderation: check for profanity and spam
    const fullText = `${title || ""} ${reviewBody}`;
    const hasProfanity = PROFANITY.test(fullText);
    const hasSpamUrl = SPAM_URL.test(fullText);
    const isTooShort = reviewBody.trim().length < 20;
    const autoFlagged = hasProfanity || hasSpamUrl || isTooShort;
    const autoFlags: string[] = [];
    if (hasProfanity) autoFlags.push("profanity");
    if (hasSpamUrl) autoFlags.push("spam_url");
    if (isTooShort) autoFlags.push("too_short");

    const supabase = await createClient();

    const { data: pro } = await supabase
      .from("professionals")
      .select("id, name, slug")
      .eq("id", professional_id)
      .eq("status", "active")
      .single();

    if (!pro) {
      return NextResponse.json({ error: "Advisor not found." }, { status: 404 });
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from("professional_reviews")
      .select("id")
      .eq("professional_id", professional_id)
      .eq("reviewer_email", reviewer_email.trim().toLowerCase())
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "You have already submitted a review for this advisor." }, { status: 409 });
    }

    // Auto-reject if flagged, otherwise pending
    const status = autoFlagged ? "flagged" : "pending";

    const { error: insertError } = await supabase
      .from("professional_reviews")
      .insert({
        professional_id,
        reviewer_name: reviewer_name.trim(),
        reviewer_email: reviewer_email.trim().toLowerCase(),
        rating,
        title: title?.trim() || null,
        body: reviewBody.trim(),
        status,
      });

    if (insertError) {
      console.error("Failed to create review:", insertError);
      return NextResponse.json({ error: "Failed to submit review." }, { status: 500 });
    }

    // Notify admin of new review
    if (process.env.RESEND_API_KEY) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Invest.com.au <system@invest.com.au>",
          to: process.env.ADMIN_EMAIL || "finnduns@gmail.com",
          subject: `New advisor review: ${pro.name} (${rating}/5)${autoFlagged ? " ⚠️ FLAGGED" : ""}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">${autoFlagged ? "⚠️ Flagged Review" : "New Review"}</h2><p style="color:#64748b;font-size:14px"><strong>${reviewer_name.trim()}</strong> reviewed <strong>${pro.name}</strong></p><p style="color:#334155;font-size:14px">${"★".repeat(Math.floor(rating))} ${rating}/5</p>${title ? `<p style="color:#334155;font-weight:600">"${title.trim()}"</p>` : ""}<p style="color:#64748b;font-size:13px">${reviewBody.trim().slice(0, 200)}${reviewBody.length > 200 ? "..." : ""}</p>${autoFlagged ? `<p style="color:#dc2626;font-size:12px;font-weight:bold">Auto-flags: ${autoFlags.join(", ")}</p>` : ""}<a href="${siteUrl}/admin/advisors" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:12px">Review in Admin →</a></div>`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: autoFlagged ? "Review submitted. It will be reviewed by our team." : "Review submitted for moderation." });
  } catch (error) {
    console.error("Advisor review error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
