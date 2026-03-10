import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";

import { notificationFooter } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/url";
import { getAdminEmail, getAdminEmails } from "@/lib/admin";

const SITE_URL = getSiteUrl();

/** Verify the current user is an admin. Returns email or null. */
async function verifyAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return getAdminEmails().includes(user.email?.toLowerCase() || "") ? user.email! : null;
}

function calcWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function calcReadTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 220));
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function logMod(supabase: Awaited<ReturnType<typeof createClient>>, articleId: number, action: string, by: string, notes?: string, oldStatus?: string, newStatus?: string) {
  const { error } = await supabase.from("advisor_article_moderation_log").insert({ article_id: articleId, action, performed_by: by, notes, old_status: oldStatus, new_status: newStatus });
  if (error) console.error("moderation log insert failed:", error.message);
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY || !to) return;
  await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: "Invest.com.au <articles@invest.com.au>", to, subject, html }) }).catch((err) => console.error("[advisor-articles] email failed:", err));
}

function wrap(title: string, body: string, cta?: string, url?: string, email?: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto"><div style="background:#0f172a;padding:16px 20px;border-radius:12px 12px 0 0"><h2 style="color:white;margin:0;font-size:16px">${title}</h2></div><div style="padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">${body}${cta && url ? `<a href="${url}" style="display:inline-block;padding:10px 24px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:12px">${cta}</a>` : ""}${notificationFooter(email)}</div></div>`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const sp = new URL(request.url).searchParams;
  const mode = sp.get("mode");
  const articleId = sp.get("id");
  const slug = sp.get("slug");

  if (articleId) {
    // Single article by ID — admin only (contains unpublished/draft content)
    const adminEmail = await verifyAdmin();
    if (!adminEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = createAdminClient();
    const { data } = await admin.from("advisor_articles").select("*").eq("id", parseInt(articleId)).single();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  if (slug) {
    const { data } = await supabase.from("advisor_articles").select("*, professionals!advisor_articles_professional_id_fkey(name, slug, firm_name, type, photo_url, verified, rating)").eq("slug", slug).eq("status", "published").single();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await supabase.from("advisor_articles").update({ view_count: (data.view_count || 0) + 1 }).eq("id", data.id);
    return NextResponse.json(data);
  }

  if (mode === "advisor" && sp.get("professional_id")) {
    const { data } = await supabase.from("advisor_articles").select("id, title, slug, content, excerpt, status, category, tags, created_at, submitted_at, published_at, view_count, click_count, admin_notes, rejection_reason, pricing_tier, payment_status, price_cents").eq("professional_id", parseInt(sp.get("professional_id")!)).order("created_at", { ascending: false });
    return NextResponse.json(data || []);
  }

  if (mode === "admin") {
    const adminEmail = await verifyAdmin();
    if (!adminEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = createAdminClient();
    let q = admin.from("advisor_articles").select("*, professionals!advisor_articles_professional_id_fkey(name, slug, firm_name, email)").order("created_at", { ascending: false });
    if (sp.get("status")) q = q.eq("status", sp.get("status")!);
    const { data } = await q;
    return NextResponse.json(data || []);
  }

  if (mode === "moderation_log" && sp.get("article_id")) {
    const adminEmail = await verifyAdmin();
    if (!adminEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = createAdminClient();
    const { data } = await admin.from("advisor_article_moderation_log").select("*").eq("article_id", parseInt(sp.get("article_id")!)).order("created_at", { ascending: false });
    return NextResponse.json(data || []);
  }

  if (mode === "guidelines") {
    const admin = createAdminClient();
    const { data } = await admin.from("article_guidelines").select("key, title, description, sort_order").eq("active", true).order("sort_order", { ascending: true });
    return NextResponse.json(data || []);
  }

  let q = supabase.from("advisor_articles").select("id, title, slug, excerpt, category, tags, author_name, author_firm, author_slug, cover_image_url, published_at, view_count, professionals!advisor_articles_professional_id_fkey(name, slug, photo_url, verified, type)").eq("status", "published").order("published_at", { ascending: false });
  const { data } = await q.limit(50);
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`advisor_article:${ip}`, 10, 60)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const supabase = await createClient();
  const body = await request.json();
  const { professional_id, title, content, excerpt, category, tags, pricing_tier, action } = body;
  if (!professional_id || !title?.trim() || !content?.trim()) return NextResponse.json({ error: "Title and content required" }, { status: 400 });

  const { data: pro } = await supabase.from("professionals").select("id, name, slug, firm_name, email, photo_url").eq("id", professional_id).eq("status", "active").single();
  if (!pro) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

  const isSubmit = action === "submit";
  const wordCount = calcWordCount(content);
  const readTime = calcReadTime(wordCount);

  if (isSubmit) {
    if (wordCount < 300) {
      return NextResponse.json({ error: `Articles must be at least 300 words. Current: ${wordCount}` }, { status: 400 });
    }
    // Server-side compliance checks
    const lower = content.toLowerCase();
    if (/(guaranteed returns|will earn|promise.*return|guaranteed.*profit)/i.test(content)) {
      return NextResponse.json({ error: "Article contains performance guarantees. Please remove any language that promises or guarantees specific returns." }, { status: 400 });
    }
    if (/(contact me|call us|my firm|visit our website|book a consultation with me|sign up now)/i.test(content)) {
      return NextResponse.json({ error: "Article contains promotional language (e.g. 'contact me', 'my firm'). Please remove self-promotion — your profile link is added automatically." }, { status: 400 });
    }
    if (title.trim().length < 15) {
      return NextResponse.json({ error: "Title is too short. Use at least 15 characters for a descriptive headline." }, { status: 400 });
    }
  }

  const articleSlug = slugify(title.trim()) + "-" + Date.now().toString(36);

  const { data: article, error } = await supabase.from("advisor_articles").insert({
    professional_id: pro.id, author_name: pro.name, author_firm: pro.firm_name, author_slug: pro.slug,
    author_photo_url: pro.photo_url || null,
    title: title.trim(), slug: articleSlug, content: content.trim(),
    excerpt: excerpt?.trim() || content.trim().replace(/[#*_\[\]]/g, "").slice(0, 160) + "...",
    category: category || "General", tags: tags || [], pricing_tier: pricing_tier || "standard",
    status: isSubmit ? "submitted" : "draft", submitted_at: isSubmit ? new Date().toISOString() : null,
    word_count: wordCount, read_time: readTime, reading_time_mins: readTime,
    price_cents: pricing_tier === "premium" ? 49900 : pricing_tier === "standard" ? 29900 : 0,
  }).select("id, slug, status").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logMod(supabase, article.id, isSubmit ? "submitted" : "draft_created", "advisor", undefined, undefined, article.status);

  if (isSubmit) {
    const adminEmail = getAdminEmail();
    await sendEmail(adminEmail, `New article: "${title}" by ${pro.name}`,
      wrap("New Article Submitted", `<p style="color:#64748b;font-size:14px"><strong>${pro.name}</strong> (${pro.firm_name || "Independent"}) submitted an article.</p><p style="color:#334155;font-size:15px;font-weight:600">"${title}"</p><p style="color:#64748b;font-size:13px">Category: ${category || "General"} \xb7 Tier: ${pricing_tier || "standard"} \xb7 ${wordCount} words \xb7 ${readTime} min read</p>`, "Review \u2192", `${SITE_URL}/admin/advisor-articles`));
  }
  return NextResponse.json(article);
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { id, action, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Article ID required" }, { status: 400 });

  // Admin-only actions require auth verification
  const ADMIN_ACTIONS = ["approve", "request_revision", "reject", "mark_paid", "waive_fee", "publish", "unpublish", "admin_edit"];
  if (ADMIN_ACTIONS.includes(action)) {
    const adminEmail = await verifyAdmin();
    if (!adminEmail) return NextResponse.json({ error: "Unauthorized — admin access required" }, { status: 401 });
  }

  const { data: cur } = await supabase.from("advisor_articles").select("status, title, author_name, slug, professionals!advisor_articles_professional_id_fkey(email, name)").eq("id", id).single();
  const oldStatus = cur?.status;
  const advEmail = (cur?.professionals as { email?: string } | null)?.email || "";
  const advName = cur?.author_name || "there";
  const artTitle = cur?.title || "your article";

  if (action === "approve") {
    const { error } = await supabase.from("advisor_articles").update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: updates.reviewed_by || "admin", admin_notes: updates.admin_notes || null }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logMod(supabase, id, "approved", updates.reviewed_by || "admin", updates.admin_notes, oldStatus, "approved");
    if (advEmail) await sendEmail(advEmail, `Article approved: "${artTitle}"`, wrap("Article Approved ✓", `<p style="color:#334155;font-size:14px">Hi ${advName.split(" ")[0]},</p><p style="color:#64748b;font-size:14px"><strong>"${artTitle}"</strong> has been approved!</p>${updates.admin_notes ? `<p style="background:#f8fafc;padding:10px;border-radius:6px;font-size:13px;color:#64748b;border-left:3px solid #7c3aed"><strong>Note:</strong> ${updates.admin_notes}</p>` : ""}<p style="color:#64748b;font-size:14px">Once payment is confirmed, it will be published with your profile linked.</p>`, "View Portal →", `${SITE_URL}/advisor-portal`));
    return NextResponse.json({ status: "approved" });
  }

  if (action === "request_revision") {
    const notes = updates.admin_notes || "Please revise based on feedback";
    const { error } = await supabase.from("advisor_articles").update({ status: "revision_requested", admin_notes: notes, reviewed_at: new Date().toISOString(), reviewed_by: updates.reviewed_by || "admin" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logMod(supabase, id, "revision_requested", updates.reviewed_by || "admin", notes, oldStatus, "revision_requested");
    if (advEmail) await sendEmail(advEmail, `Revision needed: "${artTitle}"`, wrap("Revision Requested", `<p style="color:#334155;font-size:14px">Hi ${advName.split(" ")[0]},</p><p style="color:#64748b;font-size:14px"><strong>"${artTitle}"</strong> needs some changes before approval.</p><div style="background:#fef3c7;padding:12px;border-radius:8px;margin:12px 0;border-left:3px solid #f59e0b"><p style="font-size:13px;color:#92400e;margin:0"><strong>Feedback:</strong> ${notes}</p></div><p style="color:#64748b;font-size:14px">Please revise and resubmit from your portal.</p>`, "Edit Article →", `${SITE_URL}/advisor-portal`));
    return NextResponse.json({ status: "revision_requested" });
  }

  if (action === "reject") {
    const reason = updates.rejection_reason || "Does not meet editorial standards";
    const { error } = await supabase.from("advisor_articles").update({ status: "rejected", rejection_reason: reason, reviewed_at: new Date().toISOString(), reviewed_by: updates.reviewed_by || "admin" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logMod(supabase, id, "rejected", updates.reviewed_by || "admin", reason, oldStatus, "rejected");
    if (advEmail) await sendEmail(advEmail, `Article not accepted: "${artTitle}"`, wrap("Not Accepted", `<p style="color:#334155;font-size:14px">Hi ${advName.split(" ")[0]},</p><p style="color:#64748b;font-size:14px"><strong>"${artTitle}"</strong> was not accepted for publication.</p><div style="background:#fef2f2;padding:12px;border-radius:8px;margin:12px 0;border-left:3px solid #ef4444"><p style="font-size:13px;color:#991b1b;margin:0"><strong>Reason:</strong> ${reason}</p></div><p style="color:#64748b;font-size:14px">You may submit a new article. No charge was applied.</p>`, "Submit New →", `${SITE_URL}/advisor-portal`));
    return NextResponse.json({ status: "rejected" });
  }

  if (action === "publish") {
    const { data: art } = await supabase.from("advisor_articles").select("payment_status, slug").eq("id", id).single();
    if (art && art.payment_status !== "paid" && art.payment_status !== "waived") return NextResponse.json({ error: "Payment required" }, { status: 400 });
    const { error } = await supabase.from("advisor_articles").update({ status: "published", published_at: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logMod(supabase, id, "published", updates.reviewed_by || "admin", undefined, oldStatus, "published");
    if (advEmail) await sendEmail(advEmail, `Your article is live! 🎉`, wrap("Published! 🎉", `<p style="color:#334155;font-size:14px">Hi ${advName.split(" ")[0]},</p><p style="color:#64748b;font-size:14px"><strong>"${artTitle}"</strong> is now live on Invest.com.au with your profile linked.</p>`, "View Article →", `${SITE_URL}/expert/${art?.slug || ""}`));
    return NextResponse.json({ status: "published" });
  }

  if (action === "mark_paid") {
    const { error } = await supabase.from("advisor_articles").update({ payment_status: "paid", payment_reference: updates.payment_reference || "manual", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logMod(supabase, id, "mark_paid", updates.reviewed_by || "admin", `Ref: ${updates.payment_reference || "manual"}`);
    return NextResponse.json({ payment_status: "paid" });
  }

  if (action === "waive_fee") {
    const { error } = await supabase.from("advisor_articles").update({ payment_status: "waived", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logMod(supabase, id, "waive_fee", updates.reviewed_by || "admin");
    return NextResponse.json({ payment_status: "waived" });
  }

  if (action === "admin_edit") {
    const fields: Record<string, unknown> = {};
    for (const k of ["title", "content", "excerpt", "meta_title", "meta_description", "category", "featured", "related_brokers", "related_advisor_types"]) {
      if (updates[k] !== undefined) fields[k] = updates[k];
    }
    if (updates.content) {
      const wc = calcWordCount(updates.content);
      fields.word_count = wc;
      fields.read_time = calcReadTime(wc);
    }
    const { error } = await supabase.from("advisor_articles").update(fields).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logMod(supabase, id, "admin_edit", updates.reviewed_by || "admin", `Edited: ${Object.keys(fields).join(", ")}`);
    return NextResponse.json({ edited: true });
  }

  if (action === "submit") {
    // Fetch current content for compliance checks if not provided in update
    const checkContent = updates.content || (await supabase.from("advisor_articles").select("content, title").eq("id", id).single()).data?.content || "";
    const checkTitle = updates.title || artTitle || "";
    const submitWc = calcWordCount(checkContent);
    if (submitWc < 300) return NextResponse.json({ error: `Articles must be at least 300 words. Current: ${submitWc}` }, { status: 400 });
    if (/(guaranteed returns|will earn|promise.*return|guaranteed.*profit)/i.test(checkContent)) return NextResponse.json({ error: "Article contains performance guarantees." }, { status: 400 });
    if (/(contact me|call us|my firm|visit our website|book a consultation with me|sign up now)/i.test(checkContent)) return NextResponse.json({ error: "Article contains promotional language." }, { status: 400 });

    const sf: Record<string, unknown> = { status: "submitted", submitted_at: new Date().toISOString() };
    for (const k of ["title", "content", "excerpt", "category"]) { if (updates[k]) sf[k] = updates[k]; }
    if (updates.content) { sf.word_count = submitWc; sf.read_time = calcReadTime(submitWc); }
    const { error } = await supabase.from("advisor_articles").update(sf).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logMod(supabase, id, "resubmitted", "advisor", undefined, oldStatus, "submitted");
    await sendEmail(getAdminEmail(), `Resubmitted: "${artTitle}" by ${advName}`, wrap("Article Resubmitted", `<p style="color:#64748b;font-size:14px"><strong>${advName}</strong> revised and resubmitted their article.</p><p style="color:#334155;font-size:15px;font-weight:600">"${artTitle}"</p>`, "Review →", `${SITE_URL}/admin/advisor-articles`));
    return NextResponse.json({ status: "submitted" });
  }

  // Generic save draft
  const df: Record<string, unknown> = {};
  for (const k of ["title", "content", "excerpt", "category", "pricing_tier"]) { if (updates[k]) df[k] = updates[k]; }
  if (updates.content) {
    const wc = calcWordCount(updates.content);
    df.word_count = wc;
    df.read_time = calcReadTime(wc);
  }
  const { error } = await supabase.from("advisor_articles").update(df).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
