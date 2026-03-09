import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";

const PROFANITY = /\b(fuck|shit|cunt|bitch|asshole|dick|piss|bastard|wanker|slut|whore|nigger|faggot|retard)\b/i;
const SPAM_URL = /https?:\/\/[^\s]+/i;

function isValidRating(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`advisor_review:${ip}`, 5, 60)) {
    return NextResponse.json({ error: "Too many reviews. Please try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const {
      professional_id,
      reviewer_name,
      reviewer_email,
      rating,
      communication_rating,
      expertise_rating,
      value_for_money_rating,
      used_services,
      title,
      body: reviewBody,
    } = body;

    // Required fields
    if (!professional_id || !rating || !reviewBody?.trim()) {
      return NextResponse.json({ error: "Rating and review text are required." }, { status: 400 });
    }

    // Validate overall rating
    if (!isValidRating(rating)) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    // Validate sub-ratings (required in the new flow)
    if (!isValidRating(communication_rating) || !isValidRating(expertise_rating) || !isValidRating(value_for_money_rating)) {
      return NextResponse.json({ error: "All rating categories (communication, expertise, value for money) are required and must be between 1 and 5." }, { status: 400 });
    }

    // Minimum review length
    if (reviewBody.trim().length < 50) {
      return NextResponse.json({ error: "Review must be at least 50 characters long." }, { status: 400 });
    }

    // Validate used_services
    if (typeof used_services !== "boolean") {
      return NextResponse.json({ error: "Please indicate whether you used this advisor's services." }, { status: 400 });
    }

    // Optional email validation
    if (reviewer_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(reviewer_email)) {
        return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
      }
    }

    // Auto-moderation: check for profanity and spam
    const fullText = `${title || ""} ${reviewBody}`;
    const hasProfanity = PROFANITY.test(fullText);
    const hasSpamUrl = SPAM_URL.test(fullText);
    const autoFlagged = hasProfanity || hasSpamUrl;
    const autoFlags: string[] = [];
    if (hasProfanity) autoFlags.push("profanity");
    if (hasSpamUrl) autoFlags.push("spam_url");

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

    // Check for duplicate by email (if provided) or by IP + professional combo
    if (reviewer_email) {
      const { data: existing } = await supabase
        .from("professional_reviews")
        .select("id")
        .eq("professional_id", professional_id)
        .eq("reviewer_email", reviewer_email.trim().toLowerCase())
        .limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json({ error: "You have already submitted a review for this advisor." }, { status: 409 });
      }
    }

    // Resolve reviewer name
    const resolvedName = reviewer_name?.trim() || "Anonymous";

    // Auto-reject if flagged, otherwise pending
    const status = autoFlagged ? "flagged" : "pending";

    const { error: insertError } = await supabase
      .from("professional_reviews")
      .insert({
        professional_id,
        reviewer_name: resolvedName,
        reviewer_email: reviewer_email?.trim().toLowerCase() || null,
        rating,
        communication_rating,
        expertise_rating,
        value_for_money_rating,
        used_services,
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
          to: process.env.ADMIN_EMAIL || "admin@invest.com.au",
          subject: `New advisor review: ${pro.name} (${rating}/5)${autoFlagged ? " FLAGGED" : ""}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">${autoFlagged ? "Flagged Review" : "New Review"}</h2><p style="color:#64748b;font-size:14px"><strong>${resolvedName}</strong> reviewed <strong>${pro.name}</strong></p><p style="color:#334155;font-size:14px">${"★".repeat(Math.floor(rating))} ${rating}/5</p><p style="color:#64748b;font-size:12px">Communication: ${communication_rating}/5 | Expertise: ${expertise_rating}/5 | Value: ${value_for_money_rating}/5</p><p style="color:#64748b;font-size:12px">Used services: ${used_services ? "Yes" : "No"}</p>${title ? `<p style="color:#334155;font-weight:600">"${title.trim()}"</p>` : ""}<p style="color:#64748b;font-size:13px">${reviewBody.trim().slice(0, 200)}${reviewBody.length > 200 ? "..." : ""}</p>${autoFlagged ? `<p style="color:#dc2626;font-size:12px;font-weight:bold">Auto-flags: ${autoFlags.join(", ")}</p>` : ""}<a href="${siteUrl}/admin/advisors" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:12px">Review in Admin</a></div>`,
        }),
      }).catch((err) => console.error("[advisor-review] notification email failed:", err));
    }

    return NextResponse.json({ success: true, message: autoFlagged ? "Review submitted. It will be reviewed by our team." : "Review submitted for moderation." });
  } catch (error) {
    console.error("Advisor review error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
