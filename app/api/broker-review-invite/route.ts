import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

/**
 * GET /api/broker-review-invite?token=…
 *
 * Resolves an invite token into the broker summary needed to render
 * the /review/broker/[token] form. Marks the invite as `opened` the
 * first time it's hit (for funnel measurement). Does NOT expose the
 * invite email to the client — the form submits it server-side.
 */
export async function GET(req: NextRequest) {
  if (!(await isAllowed("broker_review_invite_get", ipKey(req), { max: 30, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: invite, error } = await supabase
    .from("broker_review_invites")
    .select("id, broker_slug, broker_id, status, expires_at, email")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) {
    return NextResponse.json(
      { error: "Invite not found or expired" },
      { status: 404 },
    );
  }

  if (invite.status === "completed") {
    return NextResponse.json(
      { error: "This review has already been submitted." },
      { status: 409 },
    );
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await supabase
      .from("broker_review_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  const { data: broker } = await supabase
    .from("brokers")
    .select("id, name, slug, logo_url, rating")
    .eq("slug", invite.broker_slug)
    .maybeSingle();

  if (!broker) {
    return NextResponse.json({ error: "Broker not found" }, { status: 404 });
  }

  // Flip to `opened` on first resolve
  if (invite.status === "sent") {
    await supabase
      .from("broker_review_invites")
      .update({ status: "opened", opened_at: new Date().toISOString() })
      .eq("id", invite.id);
  }

  return NextResponse.json({
    invite: { token, broker_slug: invite.broker_slug },
    broker: {
      id: broker.id,
      name: broker.name,
      slug: broker.slug,
      logo_url: broker.logo_url,
      rating: broker.rating,
    },
  });
}

/**
 * POST /api/broker-review-invite
 *
 * Submits a review backed by an invite token. The server-side flow:
 *   1. Validate the token and fetch the pinned (email, broker_slug)
 *   2. Insert a row into user_reviews with status='auto_verified' and
 *      the invite-pinned email — bypasses the email-verify step since
 *      the token itself proves ownership of the email.
 *   3. Mark the invite completed + linked to the review
 *
 * The existing /api/user-review endpoint is preserved for organic
 * submissions (visitors writing reviews without an invite); this
 * endpoint is for the short-path invite flow.
 */
export async function POST(req: NextRequest) {
  if (!(await isAllowed("broker_review_invite_post", ipKey(req), { max: 5, refillPerSec: 0.05 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const rating = Number(body.rating);
  const reviewBody = typeof body.body === "string" ? body.body.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const display_name = typeof body.display_name === "string" ? body.display_name.trim() : "";
  const fees_rating = Number(body.fees_rating);
  const platform_rating = Number(body.platform_rating);
  const support_rating = Number(body.support_rating);
  const reliability_rating = Number(body.reliability_rating);
  const experience_months = Number(body.experience_months);

  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  if (!(rating >= 1 && rating <= 5)) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }
  if (reviewBody.length < 50 || reviewBody.length > 4000) {
    return NextResponse.json({ error: "Review body must be 50-4000 characters" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: invite } = await supabase
    .from("broker_review_invites")
    .select("id, email, broker_slug, broker_id, status")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status === "completed") {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  const { data: review, error: insertErr } = await supabase
    .from("user_reviews")
    .insert({
      broker_id: invite.broker_id,
      broker_slug: invite.broker_slug,
      display_name: display_name || "Anonymous",
      email: invite.email,
      rating: Math.round(rating),
      title: title || null,
      body: reviewBody,
      fees_rating: Number.isFinite(fees_rating) ? Math.round(fees_rating) : null,
      platform_rating: Number.isFinite(platform_rating) ? Math.round(platform_rating) : null,
      support_rating: Number.isFinite(support_rating) ? Math.round(support_rating) : null,
      reliability_rating: Number.isFinite(reliability_rating) ? Math.round(reliability_rating) : null,
      experience_months: Number.isFinite(experience_months) ? Math.round(experience_months) : null,
      status: "pending_moderation",
      verified_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !review) {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  await supabase
    .from("broker_review_invites")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      user_review_id: review.id,
    })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
