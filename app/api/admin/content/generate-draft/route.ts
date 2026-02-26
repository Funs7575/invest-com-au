import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 120;

/**
 * POST /api/admin/content/generate-draft
 * Body: { calendarId: number }
 *
 * Generates an AI draft for a content calendar item using the Anthropic API.
 * Pulls broker data from the database to give the AI real fee data context.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { calendarId } = await req.json();
  if (!calendarId) {
    return NextResponse.json(
      { error: "calendarId is required" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the content calendar item
  const { data: item, error: itemErr } = await supabase
    .from("content_calendar")
    .select("*")
    .eq("id", calendarId)
    .single();

  if (itemErr || !item) {
    return NextResponse.json(
      { error: "Calendar item not found" },
      { status: 404 }
    );
  }

  // Fetch broker data for context
  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "name, slug, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, inactivity_fee, chess_sponsored, smsf_support, rating, deal, pros, cons"
    )
    .eq("status", "active")
    .order("rating", { ascending: false });

  // Fetch existing articles for internal linking context
  const { data: existingArticles } = await supabase
    .from("articles")
    .select("title, slug, category")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30);

  // Build the broker data context
  const brokerContext = (brokers || [])
    .map(
      (b) =>
        `${b.name} (${b.slug}): ASX ${b.asx_fee || "N/A"}, US ${b.us_fee || "N/A"}, FX ${b.fx_rate != null ? b.fx_rate + "%" : "N/A"}, CHESS: ${b.chess_sponsored ? "Yes" : "No"}, SMSF: ${b.smsf_support ? "Yes" : "No"}, Rating: ${b.rating}/5${b.deal ? ", HAS DEAL" : ""}${b.inactivity_fee ? `, Inactivity: ${b.inactivity_fee}` : ""}`
    )
    .join("\n");

  // Build internal links context
  const linksContext = (existingArticles || [])
    .map((a) => `- "${a.title}" → /article/${a.slug} [${a.category || "general"}]`)
    .join("\n");

  // Build the related tools context
  const toolsContext = (item.related_tools || []).length > 0
    ? `\nRelated tools to link to: ${(item.related_tools as string[]).join(", ")}`
    : "";

  const relatedBrokersContext = (item.related_brokers || []).length > 0
    ? `\nFocus on these brokers: ${(item.related_brokers as string[]).join(", ")}`
    : "";

  const prompt = `You are writing an article for Invest.com.au, an Australian broker comparison website. Write for Australian retail investors.

ARTICLE BRIEF:
Title: ${item.title}
Type: ${item.article_type}
Category: ${item.category || "general"}
Target keyword: ${item.target_keyword || "N/A"}
Secondary keywords: ${(item.secondary_keywords as string[] || []).join(", ") || "N/A"}
${item.brief ? `Editor's brief: ${item.brief}` : ""}${toolsContext}${relatedBrokersContext}

CURRENT BROKER FEE DATA (use this real data in the article):
${brokerContext}

EXISTING ARTICLES FOR INTERNAL LINKING:
${linksContext}

Site tools to reference and link to:
- /compare — Full broker comparison table
- /quiz — 60-second broker quiz
- /fee-impact — Personal fee impact calculator
- /calculators — All calculators (switching cost, CGT, franking credits)
- /benchmark — Broker benchmark scores
- /versus/[broker-a]-vs-[broker-b] — Head-to-head comparisons
- /best/beginners, /best/low-fees, /best/us-shares, /best/smsf, /best/etfs — Best-of lists

WRITING GUIDELINES:
- Write 1,500-2,000 words
- Use Australian English (analyse, colour, etc.)
- Be opinionated — don't just list facts, give genuine editorial takes
- Include specific fee numbers from the broker data above
- Include 3-5 internal links to relevant site pages/tools
- Include a FAQ section at the end with 3-5 questions
- Structure with clear H2 and H3 headings
- Address the reader directly ("you", "your")
- End with a clear call-to-action directing to a relevant tool

OUTPUT FORMAT (return valid JSON):
{
  "title": "SEO-optimised title under 60 characters",
  "meta_title": "Title for search results (under 60 chars)",
  "meta_description": "Meta description with CTA (under 155 chars)",
  "excerpt": "2-3 sentence summary for article cards",
  "content": "Full article in markdown with ## and ### headings",
  "sections": [{"heading": "Section Title", "body": "Section content in markdown"}],
  "tags": ["tag1", "tag2"],
  "read_time": 7,
  "suggested_internal_links": ["/compare", "/fee-impact"],
  "faq": [{"question": "...", "answer": "..."}]
}`;

  // Update calendar status to drafting
  await supabase
    .from("content_calendar")
    .update({ status: "drafting" })
    .eq("id", calendarId);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      await supabase
        .from("content_calendar")
        .update({ status: "planned", notes: `AI draft failed: ${errText}` })
        .eq("id", calendarId);
      return NextResponse.json(
        { error: "Anthropic API error", details: errText },
        { status: 502 }
      );
    }

    const result = await response.json();
    const rawContent =
      result.content?.[0]?.text || "";

    // Try to parse the JSON response
    let parsed;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // If JSON parsing fails, use raw content as the article body
      parsed = {
        title: item.title,
        content: rawContent,
        sections: [],
        tags: [],
        read_time: Math.ceil(rawContent.split(/\s+/).length / 200),
        meta_title: item.title,
        meta_description: "",
        excerpt: "",
      };
    }

    // Create the draft article
    const slug = item.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: article, error: insertErr } = await supabase
      .from("articles")
      .insert({
        title: parsed.title || item.title,
        slug,
        excerpt: parsed.excerpt || "",
        category: item.category,
        content: parsed.content || rawContent,
        sections: parsed.sections || [],
        tags: parsed.tags || [],
        read_time: parsed.read_time || 7,
        related_brokers: item.related_brokers || [],
        related_calc: (item.related_tools as string[] || [])[0] || null,
        status: "draft",
        meta_title: parsed.meta_title || parsed.title || item.title,
        meta_description: parsed.meta_description || "",
        author_id: item.assigned_author_id,
        reviewer_id: item.assigned_reviewer_id,
        evergreen: true,
      })
      .select("id")
      .single();

    if (insertErr) {
      await supabase
        .from("content_calendar")
        .update({
          status: "planned",
          notes: `Draft insert failed: ${insertErr.message}`,
        })
        .eq("id", calendarId);
      return NextResponse.json(
        { error: "Failed to save draft", details: insertErr.message },
        { status: 500 }
      );
    }

    // Update calendar with the article reference
    await supabase
      .from("content_calendar")
      .update({
        status: "draft_ready",
        article_id: article.id,
        ai_draft_generated_at: new Date().toISOString(),
        ai_model: "claude-sonnet-4-5-20250929",
      })
      .eq("id", calendarId);

    return NextResponse.json({
      success: true,
      articleId: article.id,
      slug,
      title: parsed.title || item.title,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("content_calendar")
      .update({ status: "planned", notes: `AI draft error: ${message}` })
      .eq("id", calendarId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
