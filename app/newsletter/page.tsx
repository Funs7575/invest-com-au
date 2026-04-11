import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import LeadMagnet from "@/components/LeadMagnet";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Weekly Investing Newsletter Archive — ${SITE_NAME}`,
  description:
    "Browse every edition of the Invest.com.au weekly digest. Fee changes, new articles, broker deals, and market insights — delivered every Monday.",
  openGraph: {
    title: `Weekly Investing Newsletter Archive — ${SITE_NAME}`,
    description:
      "Browse every edition of the Invest.com.au weekly digest. Fee changes, new articles, broker deals, and market insights.",
    url: absoluteUrl("/newsletter"),
    images: [
      {
        url: "/api/og?title=Weekly+Newsletter+Archive&subtitle=Fee+changes,+articles+%26+deals&type=article",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/newsletter" },
};

interface NewsletterEdition {
  id: number;
  edition_date: string;
  subject: string;
  fee_changes_count: number;
  articles_count: number;
  deals_count: number;
  created_at: string;
}

export default async function NewsletterArchivePage() {
  const supabase = await createClient();

  const { data: editions } = await supabase
    .from("newsletter_editions")
    .select(
      "id, edition_date, subject, fee_changes_count, articles_count, deals_count, created_at"
    )
    .order("edition_date", { ascending: false });

  const allEditions = (editions as NewsletterEdition[]) || [];

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Newsletter" },
  ]);

  return (
    <div className="pt-5 pb-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="container-custom">
        {/* Breadcrumbs */}
        <nav className="text-xs md:text-sm text-slate-500 mb-2 md:mb-4">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Newsletter</span>
        </nav>

        {/* Page Header */}
        <div className="bg-gradient-to-r from-amber-50 to-white border border-amber-200 rounded-2xl p-4 md:p-8 mb-4 md:mb-8">
          <h1 className="text-lg md:text-4xl font-extrabold mb-0.5 md:mb-3 text-slate-900">
            Weekly Market Digest
          </h1>
          <p className="text-[0.69rem] md:text-lg text-slate-500 max-w-2xl mb-4">
            Every Monday we round up fee changes, new articles, and broker deals
            across the Australian investing landscape. Browse past editions below
            or subscribe to get the next one in your inbox.
          </p>
          <LeadMagnet />
        </div>

        {/* Editions list */}
        {allEditions.length === 0 ? (
          <div className="text-center py-8 md:py-16 text-slate-500">
            <p className="text-sm md:text-lg font-medium mb-1 md:mb-2">
              No editions yet
            </p>
            <p className="text-xs md:text-sm">
              The first weekly digest is on its way. Subscribe above to be the
              first to know.
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {allEditions.map((edition) => {
              const date = new Date(edition.edition_date + "T00:00:00Z");
              const formattedDate = date.toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              });

              return (
                <Link
                  key={edition.id}
                  href={`/newsletter/${edition.edition_date}`}
                  className="block border border-slate-200 rounded-xl bg-white hover:shadow-lg hover:border-amber-300 transition-all p-4 md:p-6 group"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="text-xs text-amber-600 font-semibold mb-1">
                        {formattedDate}
                      </p>
                      <h2 className="text-sm md:text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-1">
                        {edition.subject}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 shrink-0">
                      {edition.fee_changes_count > 0 && (
                        <span className="text-[0.69rem] md:text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                          {edition.fee_changes_count} fee{" "}
                          {edition.fee_changes_count === 1
                            ? "change"
                            : "changes"}
                        </span>
                      )}
                      {edition.articles_count > 0 && (
                        <span className="text-[0.69rem] md:text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {edition.articles_count}{" "}
                          {edition.articles_count === 1
                            ? "article"
                            : "articles"}
                        </span>
                      )}
                      {edition.deals_count > 0 && (
                        <span className="text-[0.69rem] md:text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          {edition.deals_count}{" "}
                          {edition.deals_count === 1 ? "deal" : "deals"}
                        </span>
                      )}
                      <span className="text-xs md:text-sm font-semibold text-slate-400 group-hover:text-amber-600 transition-colors">
                        Read &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
