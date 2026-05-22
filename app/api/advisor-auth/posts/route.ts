import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("advisor-auth:posts");

const PostSchema = z.object({
  body: z.string().min(1).max(2000),
  post_type: z.enum(["update", "insight", "question", "resource"]).optional().default("update"),
  link_url: z.string().url().optional().nullable(),
  link_title: z.string().max(200).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
});

const DeleteSchema = z.object({
  postId: z.coerce.number().int().positive(),
});

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_posts_get:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: posts, error } = await admin
    .from("advisor_posts")
    .select("*")
    .eq("professional_id", professionalId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    log.error("Failed to fetch advisor posts", { error: error.message, professionalId });
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }

  return NextResponse.json({ posts: posts ?? [] });
}

export const POST = withValidatedBody(PostSchema, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_posts_create:${ip}`, 5, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: post, error } = await admin
    .from("advisor_posts")
    .insert({
      professional_id: professionalId,
      body: body.body,
      post_type: body.post_type,
      link_url: body.link_url ?? null,
      link_title: body.link_title ?? null,
      image_url: body.image_url ?? null,
      status: "published",
    })
    .select("*")
    .single();

  if (error || !post) {
    log.error("Failed to create advisor post", { error: error?.message, professionalId });
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }

  return NextResponse.json({ post }, { status: 201 });
});

export const DELETE = withValidatedBody(DeleteSchema, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_posts_delete:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // Verify ownership before soft-deleting
  const { data: existing } = await admin
    .from("advisor_posts")
    .select("id, professional_id")
    .eq("id", body.postId)
    .single();

  if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (existing.professional_id !== professionalId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin
    .from("advisor_posts")
    .update({ status: "deleted" })
    .eq("id", body.postId);

  if (error) {
    log.error("Failed to delete advisor post", { error: error.message, postId: body.postId });
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
