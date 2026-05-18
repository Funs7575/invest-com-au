import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails } from "@/lib/admin";
import { INTERNAL_LINK_TARGETS, GLOSSARY_LINK_TARGETS } from "@/lib/keyword-linking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Internal linking audit — Admin",
  robots: { index: false, follow: false },
};

// FIN_NOTEBOOK item 19. Scans published articles for unlinked
// references to keyword targets in lib/keyword-linking.ts and surfaces
// suggestions an editor can review + accept manually.
//
// This is a read-only audit surface — it does NOT auto-rewrite article
// bodies. Editors review the suggestions and apply links via the
// existing article edit flow at /admin/content/articles/[slug] (or
// just paste the suggested anchor into the body). The reason for
// keeping a human in the loop:
//   1. Auto-linking can over-link the same keyword (degrades UX +
//      Google's "natural linking" expectations).
//   2. Anchor text choice is editorial — "broker fees" vs "brokerage
//      fees" matters for context.
//   3. Mid-sentence cuts that would happen automatically often read
//      worse than a paragraph-end link.

interface ArticleRow {
  id: number;
  slug: string;
  title: string;
  body: string;
  category: string | null;
  updated_at: string;
}

interface LinkSuggestion {
  article: { slug: string; title: string; updated_at: string };
  matches: Array<{
    keyword: string;
    targetPath: string;
    occurrences: number;
    /** True if the article already has at least one link to targetPath
     *  (so this suggestion is "you mention this keyword but only link to
     *  it once — consider linking on the other occurrence too").  */
    alreadyLinked: boolean;
  }>;
  totalSuggestions: number;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const lower = haystack.toLowerCase();
  const needleLower = needle.toLowerCase();
  let count = 0;
  let idx = 0;
  while ((idx = lower.indexOf(needleLower, idx)) !== -1) {
    count++;
    idx += needleLower.length;
  }
  return count;
}

function alreadyLinks(body: string, path: string): boolean {
  return body.includes(`href="${path}"`) || body.includes(`href='${path}'`);
}

export default async function InternalLinkingPage() {
  // Admin-page gate. requireAdmin() returns a NextResponse on failure
  // which page components can't return; use redirect() + getUser() +
  // ADMIN_EMAILS instead.
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || !user.email || !getAdminEmails().includes(user.email.toLowerCase())) {
    redirect("/admin/login?redirect=/admin/internal-linking");
  }

  const supabase = createAdminClient();

  // Pull the 100 most-recently-updated published articles so the audit
  // surfaces freshly-edited content first. Bigger sweeps run as a cron;
  // this page is the editor's review queue.
  const { data: articleRows, error } = await supabase
    .from("articles")
    .select("id, slug, title, body, category, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-red-700">Failed to load articles: {error.message}</p>
      </div>
    );
  }

  const articles = (articleRows ?? []) as ArticleRow[];
  const targets = [...INTERNAL_LINK_TARGETS, ...GLOSSARY_LINK_TARGETS];

  const suggestions: LinkSuggestion[] = [];

  for (const article of articles) {
    if (!article.body) continue;
    const matches: LinkSuggestion["matches"] = [];

    for (const target of targets) {
      const occurrences = countOccurrences(article.body, target.keyword);
      if (occurrences === 0) continue;
      const alreadyLinked = alreadyLinks(article.body, target.href);
      // Suggestion logic:
      //   - keyword appears AND we don't link to the target → suggest.
      //   - keyword appears 2+ times AND we link once → suggest adding
      //     a second link only if there are 4+ occurrences (otherwise
      //     over-linking).
      if (!alreadyLinked) {
        matches.push({
          keyword: target.keyword,
          targetPath: target.href,
          occurrences,
          alreadyLinked: false,
        });
      } else if (occurrences >= 4) {
        matches.push({
          keyword: target.keyword,
          targetPath: target.href,
          occurrences,
          alreadyLinked: true,
        });
      }
    }

    if (matches.length === 0) continue;
    // Show the highest-leverage articles first (most missing links).
    matches.sort((a, b) => b.occurrences - a.occurrences);
    suggestions.push({
      article: {
        slug: article.slug,
        title: article.title,
        updated_at: article.updated_at,
      },
      matches: matches.slice(0, 10),
      totalSuggestions: matches.length,
    });
  }

  suggestions.sort((a, b) => b.totalSuggestions - a.totalSuggestions);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Admin · SEO</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Internal linking audit</h1>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">
          Scans the 100 most-recently-updated published articles for unlinked references to the
          INTERNAL_LINK_TARGETS + GLOSSARY_LINK_TARGETS in <code>lib/keyword-linking.ts</code>.
          Suggestions are advisory — review and apply manually via the article editor. Re-runs
          on every page load.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {articles.length} articles scanned · {targets.length} link targets · {suggestions.length} articles with suggestions
        </p>
      </header>

      {suggestions.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          ✓ Every recent published article already links every target keyword it mentions. Add more
          link targets in <code>lib/keyword-linking.ts</code> to expand coverage.
        </div>
      ) : (
        <ul className="space-y-4">
          {suggestions.map((s) => (
            <li key={s.article.slug} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/article/${s.article.slug}`}
                    className="text-sm font-semibold text-slate-900 hover:underline"
                  >
                    {s.article.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {s.totalSuggestions} suggestion{s.totalSuggestions === 1 ? "" : "s"} · updated{" "}
                    {new Date(s.article.updated_at).toLocaleDateString("en-AU")}
                  </p>
                </div>
                <Link
                  href={`/admin/content/articles?slug=${s.article.slug}`}
                  className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Edit
                </Link>
              </div>
              <ul className="mt-3 space-y-1.5">
                {s.matches.map((m) => (
                  <li
                    key={`${m.keyword}-${m.targetPath}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-800">{m.keyword}</span>
                      <span className="ml-2 text-slate-500">
                        × {m.occurrences} {m.occurrences === 1 ? "occurrence" : "occurrences"}
                      </span>
                      {m.alreadyLinked && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[0.6rem] font-semibold text-amber-800">
                          already linked once
                        </span>
                      )}
                    </div>
                    <code className="shrink-0 truncate text-slate-500">→ {m.targetPath}</code>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
