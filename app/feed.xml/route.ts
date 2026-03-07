import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://invest.com.au";

export async function GET() {
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("title, slug, excerpt, category, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: expertArticles } = await supabase
    .from("advisor_articles")
    .select("title, slug, excerpt, author_name, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(20);

  const items = [
    ...(articles || []).map(a => ({
      title: a.title,
      link: `${SITE_URL}/article/${a.slug}`,
      description: a.excerpt || "",
      pubDate: new Date(a.created_at).toUTCString(),
      category: a.category || "Investing",
    })),
    ...(expertArticles || []).map(a => ({
      title: a.title,
      link: `${SITE_URL}/expert/${a.slug}`,
      description: a.excerpt || "",
      pubDate: new Date(a.published_at || "").toUTCString(),
      category: "Expert Insights",
    })),
  ].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()).slice(0, 30);

  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Invest.com.au — Australian Investing Guides</title>
    <link>${SITE_URL}</link>
    <description>Compare investing platforms, read expert guides, and find financial advisors in Australia.</description>
    <language>en-au</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items.map(item => `<item>
      <title>${escape(item.title)}</title>
      <link>${item.link}</link>
      <description>${escape(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>
      <category>${escape(item.category)}</category>
      <guid isPermaLink="true">${item.link}</guid>
    </item>`).join("\n    ")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
