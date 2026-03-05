import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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

    const supabase = await createClient();

    // Verify the professional exists
    const { data: pro } = await supabase
      .from("professionals")
      .select("id, name")
      .eq("id", professional_id)
      .eq("status", "active")
      .single();

    if (!pro) {
      return NextResponse.json({ error: "Advisor not found." }, { status: 404 });
    }

    // Check for duplicate review (same email + same advisor)
    const { data: existing } = await supabase
      .from("professional_reviews")
      .select("id")
      .eq("professional_id", professional_id)
      .eq("reviewer_email", reviewer_email.trim().toLowerCase())
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "You have already submitted a review for this advisor." }, { status: 409 });
    }

    // Create review (pending moderation)
    const { error: insertError } = await supabase
      .from("professional_reviews")
      .insert({
        professional_id,
        reviewer_name: reviewer_name.trim(),
        reviewer_email: reviewer_email.trim().toLowerCase(),
        rating,
        title: title?.trim() || null,
        body: reviewBody.trim(),
        status: "pending",
      });

    if (insertError) {
      console.error("Failed to create review:", insertError);
      return NextResponse.json({ error: "Failed to submit review." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Review submitted for moderation." });
  } catch (error) {
    console.error("Advisor review error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
