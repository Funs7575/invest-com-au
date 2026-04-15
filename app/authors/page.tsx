import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { formatRole, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Our Editorial Team — ${SITE_NAME}`,
  description: `Meet the financial writers, licensed advisors and analysts behind ${SITE_NAME}. Independent Australian investing research.`,
  alternates: { canonical: "/authors" },
};

interface TeamMember {
  slug: string;
  full_name: string;
  role: string;
  short_bio: string | null;
  profile_image_url: string | null;
  credentials: string[] | null;
}

/**
 * /authors — index of everyone who writes for the site.
 *
 * Pulls every active team_members row with display_on_about=true.
 * This is the top-of-funnel trust page Google E-E-A-T wants,
 * and it back-links to every author profile for deep crawling.
 */
export default async function AuthorsIndexPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("slug, full_name, role, short_bio, profile_image_url, credentials, display_order")
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .order("full_name", { ascending: true });

  const members = (data as (TeamMember & { display_order: number | null })[] | null) || [];

  return (
    <div className="py-8 md:py-14">
      <div className="container-custom max-w-5xl">
        <nav className="text-xs md:text-sm text-slate-500 mb-3">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Our Editorial Team</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
            Meet our editorial team
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl">
            Every review, guide and broker comparison on {SITE_NAME} is
            written by a named human — many with ASIC-held AFSL authorisation
            numbers, tax agent registrations, or credit licences. Our work is
            independent: we don&rsquo;t let commercial partners preview or
            edit our content.
          </p>
        </div>

        {members.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm text-slate-600">Team profiles coming soon.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {members.map((m) => (
              <li
                key={m.slug}
                className="flex gap-4 border border-slate-200 rounded-xl bg-white p-5 hover:shadow-md transition-shadow"
              >
                {m.profile_image_url ? (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100 shrink-0">
                    <Image
                      src={m.profile_image_url}
                      alt={m.full_name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-20 h-20 rounded-full bg-slate-100 shrink-0 flex items-center justify-center text-2xl font-bold text-slate-500"
                    aria-hidden
                  >
                    {m.full_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/authors/${m.slug}`}
                    className="block text-base font-bold text-slate-900 hover:text-primary"
                  >
                    {m.full_name}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatRole(m.role)}
                  </p>
                  {m.credentials && m.credentials.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.credentials.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.short_bio && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-3">
                      {m.short_bio}
                    </p>
                  )}
                  <Link
                    href={`/authors/${m.slug}`}
                    className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    View profile →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
