import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";

// GET — fetch articles (public: published only, admin: all, advisor: own)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode"); // "admin" | "advisor" | default (public)
  const professionalId = searchParams.get("professional_id");
  const slug = searchParams.get("slug");
  const category = searchParams.get("category");
  const status = searchParams.get("status");

  // Single article by slug (public)
  if (slug) {
    const { data, error } = await supabase
      .from("advisor_articles")
      .select("*, professionals!advisor_articles_professional_id_fkey(name, slug, firm_name, type, photo_url, verified, rating)")
      .eq("slug", slug)
      .eq("status", "published")
      .single();
    if (error || !data) return NextResponse.json({ error: "Article not found" }, { status: 404 });
    // Increment view count
    await supabase.from("advisor_articles").update({ view_count: (data.view_count || 0) + 1 }).eq("id", data.id);
    return NextResponse.json(data);
  }

  // Advisor's own articles
  if (mode === "advisor" && professionalId) {
    const { data } = await supabase
      .from("advisor_articles")
      .select("id, title, slug, status, category, created_at, submitted_at, published_at, view_count, click_count, admin_notes, pricing_tier, payment_status")
      .eq("professional_id", parseInt(professionalId))
      .order("created_at", { ascending: false });
    return NextResponse.json(data || []);
  }

  // Admin — all articles with filters
  if (mode === "admin") {
    let query = supabase
      .from("advisor_articles")
      .select("*, professionals!advisor_articles_professional_id_fkey(name, slug, firm_name)")
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data } = await query;
    return NextResponse.json(data || []);
  }

  // Public — published articles
  let query = supabase
    .from("advisor_articles")
    .select("id, title, slug, excerpt, category, tags, author_name, author_firm, author_slug, cover_image_url, published_at, view_count, professionals!advisor_articles_professional_id_fkey(name, slug, photo_url, verified, type)")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data } = await query.limit(50);
  return NextResponse.json(data || []);
}

// POST — create or submit article (advisor)
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`advisor_article:${ip}`, 10, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const body = await request.json();
  const { professional_id, title, content, excerpt, category, tags, pricing_tier, action } = body;

  if (!professional_id || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Professional ID, title, and content are required" }, { status: 400 });
  }

  // Verify the professional exists
  const { data: pro } = await supabase
    .from("professionals")
    .select("id, name, slug, firm_name")
    .eq("id", professional_id)
    .eq("status", "active")
    .single();

  if (!pro) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

  const isSubmitting = action === "submit";

  const { data: article, error } = await supabase
    .from("advisor_articles")
    .insert({
      professional_id: pro.id,
      author_name: pro.name,
      author_firm: pro.firm_name,
      author_slug: pro.slug,
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt?.trim() || content.trim().slice(0, 160) + "...",
      category: category || "General",
      tags: tags || [],
      pricing_tier: pricing_tier || "standard",
      status: isSubmitting ? "submitted" : "draft",
      submitted_at: isSubmitting ? new Date().toISOString() : null,
      price_cents: pricing_tier === "featured" ? 49900 : pricing_tier === "sponsored" ? 79900 : 29900,
    })
    .select("id, slug, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify admin if submitted
  if (isSubmitting && process.env.RESEND_API_KEY) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Invest.com.au <system@invest.com.au>",
        to: process.env.ADMIN_EMAIL || "finnduns@gmail.com",
        subject: `New article submission: "${title}" by ${pro.name}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">New Article Submitted</h2><p style="color:#64748b;font-size:14px"><strong>${pro.name}</strong> (${pro.firm_name || "Independent"}) has submitted an article for review.</p><p style="color:#334155;font-size:15px;font-weight:600">"${title}"</p><p style="color:#64748b;font-size:13px">Category: ${category || "General"}<br>Tier: ${pricing_tier || "standard"}</p><a href="${siteUrl}/admin/advisor-articles" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:12px">Review in Admin →</a></div>`,
      }),
    }).catch(() => {});
  }

  return NextResponse.json(article);
}

// PUT — update article (advisor updates draft, or admin reviews)
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { id, action, ...updates } = body;

  if (!id) return NextResponse.json({ error: "Article ID required" }, { status: 400 });

  // Admin actions
  if (action === "approve") {
    const { error } = await supabase
      .from("advisor_articles")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: updates.reviewed_by || "admin",
        admin_notes: updates.admin_notes || null,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "approved" });
  }

  if (action === "publish") {
    const { data: article } = await supabase.from("advisor_articles").select("payment_status, pricing_tier").eq("id", id).single();
    // Allow publish if paid or waived
    if (article && article.payment_status !== "paid" && article.payment_status !== "waived") {
      return NextResponse.json({ error: "Payment required before publishing" }, { status: 400 });
    }
    const { error } = await supabase
      .from("advisor_articles")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "published" });
  }

  if (action === "reject") {
    const { error } = await supabase
      .from("advisor_articles")
      .update({
        status: "rejected",
        rejection_reason: updates.rejection_reason || "Does not meet editorial standards",
        reviewed_at: new Date().toISOString(),
        reviewed_by: updates.reviewed_by || "admin",
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "rejected" });
  }

  if (action === "request_revision") {
    const { error } = await supabase
      .from("advisor_articles")
      .update({
        status: "revision_requested",
        admin_notes: updates.admin_notes || "Please revise and resubmit",
        reviewed_at: new Date().toISOString(),
        reviewed_by: updates.reviewed_by || "admin",
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "revision_requested" });
  }

  if (action === "mark_paid") {
    const { error } = await supabase
      .from("advisor_articles")
      .update({
        payment_status: "paid",
        payment_reference: updates.payment_reference || "manual",
        paid_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ payment_status: "paid" });
  }

  if (action === "waive_fee") {
    const { error } = await supabase
      .from("advisor_articles")
      .update({ payment_status: "waived", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ payment_status: "waived" });
  }

  // Advisor updating their draft/revision
  if (action === "submit") {
    const { error } = await supabase
      .from("advisor_articles")
      .update({
        ...updates,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: "submitted" });
  }

  // Generic update (save draft)
  const { error } = await supabase
    .from("advisor_articles")
    .update(updates)
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
