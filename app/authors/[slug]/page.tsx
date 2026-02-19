import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { TeamMember, Article } from "@/lib/types";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  profilePageJsonLd,
  formatRole,
  SITE_NAME,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("full_name, role, short_bio")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!member) return { title: "Author Not Found" };

  const title = `${member.full_name} — ${formatRole(member.role)} at ${SITE_NAME}`;
  const description =
    member.short_bio ||
    `${member.full_name} is a ${formatRole(member.role).toLowerCase()} at ${SITE_NAME}.`;

  const ogImageUrl = `/api/og?title=${encodeURIComponent(member.full_name)}&subtitle=${encodeURIComponent(formatRole(member.role) + " at " + SITE_NAME)}&type=default`;
  return {
    title,
    description,
    openGraph: {
      type: "profile" as const,
      title,
      description,
      url: absoluteUrl(`/authors/${slug}`),
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: member.full_name }],
    },
    twitter: { card: "summary_large_image" as const },
    alternates: {
      canonical: `/authors/${slug}`,
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!member) notFound();

  const m = member as TeamMember;

  // Fetch articles by this author
  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, category, published_at, read_time")
    .eq("author_id", m.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const authorArticles = (articles || []) as Article[];

  const profileLd = profilePageJsonLd(m, "authors");
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Authors", url: absoluteUrl("/authors") },
    { name: m.full_name },
  ]);

  const initials = m.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Hero */}
      <section className="bg-brand text-white py-16">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <div className="text-sm text-slate-400 mb-8">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span className="mx-2">/</span>
              <span className="text-slate-300">{m.full_name}</span>
            </div>

            <div className="flex items-start gap-6">
              {/* Avatar */}
              {m.avatar_url ? (
                <Image
                  src={m.avatar_url}
                  alt={m.full_name}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/20 shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-amber-500 flex items-center justify-center text-2xl font-bold text-black shrink-0">
                  {initials}
                </div>
              )}

              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
                  {m.full_name}
                </h1>
                <span className="inline-block text-sm font-medium bg-white/10 text-amber-400 px-3 py-1 rounded-full">
                  {formatRole(m.role)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="py-12">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Bio */}
            {m.short_bio && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">About</h2>
                <p className="text-slate-700 leading-relaxed">{m.short_bio}</p>
              </div>
            )}

            {/* Credentials */}
            {m.credentials && m.credentials.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">
                  Credentials &amp; Expertise
                </h2>
                <ul className="space-y-2">
                  {m.credentials.map((cred, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-slate-700"
                    >
                      <span className="text-green-600 mt-0.5">&#10003;</span>
                      {cred}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclosure */}
            {m.disclosure && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-amber-800 mb-1">
                  Disclosure
                </h3>
                <p className="text-sm text-amber-900/80 leading-relaxed">
                  {m.disclosure}
                </p>
              </div>
            )}

            {/* Links */}
            {(m.linkedin_url || m.twitter_url || (m.publications && m.publications.length > 0)) && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">Links</h2>
                <div className="flex flex-wrap gap-3">
                  {m.linkedin_url && (
                    <a
                      href={m.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {m.twitter_url && (
                    <a
                      href={m.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Twitter / X
                    </a>
                  )}
                  {m.publications?.map((pub, i) => (
                    <a
                      key={i}
                      href={pub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      {pub.name}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Editorial Contact
              </h3>
              <p className="text-sm text-slate-600">
                For corrections, questions, or feedback:{" "}
                <a
                  href="mailto:editorial@invest.com.au"
                  className="text-green-700 hover:underline"
                >
                  editorial@invest.com.au
                </a>
              </p>
              <p className="text-sm text-slate-500 mt-1">
                <Link href="/editorial-policy" className="text-green-700 hover:underline">
                  Read our editorial policy
                </Link>
                {" "}&middot;{" "}
                <Link href="/methodology" className="text-green-700 hover:underline">
                  Our methodology
                </Link>
              </p>
            </div>

            {/* Articles by this author */}
            {authorArticles.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Articles by {m.full_name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {authorArticles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-slate-300 transition-all bg-white"
                    >
                      {article.category && (
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {article.category}
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-slate-900 mt-1 mb-2 line-clamp-2">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {article.read_time && (
                          <span>{article.read_time} min read</span>
                        )}
                        {article.published_at && (
                          <span>
                            {new Date(article.published_at).toLocaleDateString(
                              "en-AU",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
