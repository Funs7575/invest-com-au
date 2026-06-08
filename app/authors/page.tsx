import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd, formatRole, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import JsonLd from "@/components/JsonLd";

const AUTHORS_FAQS = [
  {
    q: "Who writes the investing guides and reviews on Invest.com.au?",
    a: "All editorial content is written by named financial professionals — many hold ASIC-issued AFSL Authorised Representative (AR) numbers, TPB-registered Tax Agent status, or relevant qualifications (CFP, CPA, RG146). Each author's credentials, disclosure statement, and professional affiliations are listed on their author profile page. We do not publish unsigned content or AI-generated copy without human expert review.",
  },
  {
    q: "How do I verify an author's credentials on Invest.com.au?",
    a: "Click any author's name to view their profile page. Profiles show: their AFSL or AR number (verifiable on ASIC's Financial Advisers Register), TPB tax agent registration number (verifiable at tpb.gov.au), relevant qualifications (CFP, CPA, RG146), years of experience, and a conflict-of-interest disclosure. We cross-check AFSL status annually — authors who lose their licence are removed from editorial roles.",
  },
  {
    q: "Does Invest.com.au publish sponsored or paid articles?",
    a: "No. Commercial relationships (affiliate commissions, platform sponsorships, and featured placement fees) are entirely separate from editorial content. Brokers and platforms cannot pay to influence our star ratings, rankings, or editorial coverage. Paid content — if any is published — is clearly labelled 'Sponsored'. Our editorial team does not receive revenue-linked bonuses tied to affiliate performance.",
  },
  {
    q: "Can I contribute an investing article to Invest.com.au?",
    a: "Yes — we publish articles from credentialled Australian financial professionals: licensed financial planners, SMSF accountants, tax agents, property advisors, and sector specialists. Contact us at editorial@invest.com.au with your credentials, the topic you want to cover, and a brief outline. Contributors must disclose any financial interests in products or platforms they write about, and articles are reviewed for factual accuracy and ASIC compliance before publication.",
  },
];

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

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Our Editorial Team" },
  ]);
  const faqLd = faqJsonLd(AUTHORS_FAQS);

  return (
    <div className="py-8 md:py-14">
      <JsonLd data={faqLd ? [breadcrumb, faqLd] : breadcrumb} testId="authors-jsonld" />
      <div className="container-custom max-w-5xl">
        <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-3">
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
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-4">
            <p className="text-base font-semibold text-slate-900">Are you a financial adviser or investing expert?</p>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Share your insights with 50,000+ investors. We publish independent guides, platform reviews, and strategy pieces from credentialled Australian professionals.
            </p>
            <Link
              href="/contact"
              className="inline-block px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
            >
              Apply to write →
            </Link>
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
        {/* FAQ */}
        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {AUTHORS_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
