import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePreviewToken } from "@/lib/article-preview-tokens";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Draft preview",
  robots: "noindex, nofollow",
};

interface ArticleDraft {
  title: string;
  excerpt: string | null;
  content: string | null;
  sections: Array<{ heading: string; body: string }> | null;
  category: string | null;
  tags: string[] | null;
  status: string;
  author_name: string | null;
  updated_at: string;
}

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * /preview/[token] — public (token-gated) preview of an article draft.
 *
 * Renders the current draft content — title, excerpt, either the
 * structured `sections` list or the raw `content` markdown, tags
 * and category. Headlined by a clear "DRAFT PREVIEW" banner so
 * nobody confuses this for a live page, and `noindex, nofollow`
 * so Google never crawls it.
 *
 * Token validation is handled by `resolvePreviewToken` which
 * returns null on any failure (expired, revoked, not found) —
 * we 404 uniformly to avoid leaking which reason.
 */
export default async function DraftPreviewPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolvePreviewToken(token);
  if (!resolved) notFound();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("articles")
    .select(
      "title, excerpt, content, sections, category, tags, status, author_name, updated_at",
    )
    .eq("slug", resolved.slug)
    .maybeSingle();

  if (!data) notFound();
  const article = data as ArticleDraft;

  const updated = article.updated_at
    ? new Date(article.updated_at).toLocaleString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

  return (
    <div>
      {/* DRAFT PREVIEW banner — always visible, impossible to miss */}
      <div
        role="note"
        aria-label="Draft preview"
        className="bg-amber-500 text-slate-900 py-3 border-b-4 border-amber-600"
      >
        <div className="container-custom flex flex-wrap items-center gap-3 justify-between">
          <p className="text-sm font-extrabold">
            DRAFT PREVIEW &mdash; not publicly indexed
          </p>
          <p className="text-xs">
            Status: <strong className="uppercase">{article.status}</strong>
            &nbsp;·&nbsp; Last updated {updated}
          </p>
        </div>
      </div>

      <article className="py-8 md:py-12">
        <div className="container-custom max-w-3xl">
          <nav className="text-xs text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-slate-700">Draft preview</span>
          </nav>

          {article.category && (
            <span className="inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 mb-3">
              {article.category}
            </span>
          )}

          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-lg text-slate-600 leading-relaxed mb-6">
              {article.excerpt}
            </p>
          )}

          {article.author_name && (
            <p className="text-xs text-slate-500 mb-8">
              By {article.author_name}
            </p>
          )}

          {/* Structured sections renderer (Wave 3+) */}
          {article.sections && article.sections.length > 0 ? (
            <div className="prose prose-slate max-w-none">
              {article.sections.map((section, i) => (
                <section key={i} className="mt-8 first:mt-0">
                  <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-8 mb-3">
                    {section.heading}
                  </h2>
                  <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                    {section.body}
                  </div>
                </section>
              ))}
            </div>
          ) : article.content ? (
            // Fallback for pre-section articles or raw markdown drafts
            <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-800 leading-relaxed">
              {article.content}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              (No body yet — the article row exists but <code>content</code>{" "}
              and <code>sections</code> are empty.)
            </p>
          )}

          {article.tags && article.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-slate-200">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
