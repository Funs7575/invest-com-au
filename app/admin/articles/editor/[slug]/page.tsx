import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "@/components/AdminShell";
import ArticleEditorClient from "./ArticleEditorClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

interface ArticleRow {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  category: string | null;
  tags: string[] | null;
  status: string;
  updated_at: string;
}

interface TemplateRow {
  slug: string;
  display_name: string;
  description: string;
  min_words: number;
  required_sections: Array<{ heading: string; intent: string; placeholder?: string }>;
  compliance_notes: string | null;
}

/**
 * /admin/articles/editor/[slug]
 *
 * Writer-facing split-pane editor. Left: title/excerpt/body/tags/
 * category inputs. Right: live deterministic scorecard with grade,
 * remediation list, and a button to "save and run persistent scorecard"
 * (writes to article_scorecard_runs).
 *
 * Uses the slug param to fetch an existing article OR accept a
 * "new" draft keyed by the slug. If the slug is "new" we initialise
 * an empty draft. Editorial explicitly creates the slug in the
 * URL — this avoids collisions with the existing article admin
 * page's own "create" modal.
 */
export default async function AdminArticleEditorPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const supabase = createAdminClient();

  // Fetch the article if it exists — the slug 'new' is treated as
  // a blank-slate draft so the editor doubles as a create flow.
  let article: ArticleRow | null = null;
  if (slug !== "new") {
    const { data } = await supabase
      .from("articles")
      .select("id, slug, title, excerpt, content, category, tags, status, updated_at")
      .eq("slug", slug)
      .maybeSingle();
    article = (data as ArticleRow | null) || null;
  }

  // Load every template so the editor can offer "start from template"
  const { data: templatesData } = await supabase
    .from("article_templates")
    .select("slug, display_name, description, min_words, required_sections, compliance_notes")
    .eq("status", "active")
    .order("display_order", { ascending: true });

  const templates = (templatesData as TemplateRow[] | null) || [];

  return (
    <AdminShell title={article ? `Edit: ${article.title}` : "New article"}>
      <div className="max-w-[1400px]">
        <ArticleEditorClient
          initialSlug={slug}
          initialArticle={
            article
              ? {
                  id: article.id,
                  slug: article.slug,
                  title: article.title,
                  excerpt: article.excerpt,
                  content: article.content,
                  category: article.category,
                  tags: article.tags,
                  status: article.status,
                }
              : null
          }
          templates={templates}
        />
      </div>
    </AdminShell>
  );
}
